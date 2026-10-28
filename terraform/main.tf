terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# Both providers use `aws eks get-token` so they never store a static credential.
# Requires AWS CLI v2 on the machine running terraform apply.
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.region]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.region]
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# ── VPC ────────────────────────────────────────────────────────────────────────
# Public subnets only — nodes get public IPs and reach ECR via the IGW.
# Skipping private subnets + NAT Gateway saves ~$0.045/hr during testing.
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.cluster_name}-vpc"
  cidr = "10.0.0.0/16"

  azs            = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnets = ["10.0.1.0/24", "10.0.2.0/24"]

  enable_nat_gateway      = false
  enable_dns_hostnames    = true
  enable_dns_support      = true
  map_public_ip_on_launch = true

  # Tags required by EKS for subnet discovery and ALB provisioning
  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }

  tags = {
    Environment = "learning"
    Project     = var.cluster_name
  }
}

# ── EKS ────────────────────────────────────────────────────────────────────────
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.31"

  # Public endpoint so GitHub Actions (and your laptop) can run kubectl
  cluster_endpoint_public_access           = true
  enable_cluster_creator_admin_permissions = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnets

  # OIDC provider needed for IRSA (ALB controller + EBS CSI)
  enable_irsa = true

  cluster_addons = {
    coredns    = { most_recent = true }
    kube-proxy = { most_recent = true }
    vpc-cni    = { most_recent = true }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  eks_managed_node_groups = {
    main = {
      # c7i-flex.large: 2 vCPU, 4 GiB — free tier eligible.
      # If unavailable in your AZ, change to ["t3.medium"] as a fallback.
      instance_types = ["c7i-flex.large"]
      capacity_type  = "ON_DEMAND"

      min_size     = 1
      max_size     = 1
      desired_size = 1

      subnet_ids = module.vpc.public_subnets
    }
  }

  tags = {
    Environment = "learning"
    Project     = var.cluster_name
  }
}

# ── EBS CSI IRSA ───────────────────────────────────────────────────────────────
# Lets the EBS CSI driver create/attach EBS volumes for the Postgres PVC.
module "ebs_csi_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name             = "${var.cluster_name}-ebs-csi"
  attach_ebs_csi_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }
}
