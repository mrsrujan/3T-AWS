data "aws_caller_identity" "current" {}

output "configure_kubectl" {
  description = "Run this after terraform apply to point kubectl at the cluster"
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.region}"
}

output "ecr_backend_url" {
  description = "ECR URL for the backend image (use in GitHub Actions secret or manual push)"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR URL for the frontend image"
  value       = aws_ecr_repository.frontend.repository_url
}

output "aws_account_id" {
  description = "Your AWS account ID — needed when setting up GitHub Actions"
  value       = data.aws_caller_identity.current.account_id
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "get_alb_url" {
  description = "Run this after deploying to get the app URL"
  value       = "kubectl get ingress -n stockmantra"
}

output "before_destroy" {
  description = "Run this before terraform destroy to avoid orphaned EBS volumes"
  value       = "kubectl delete pvc --all -n stockmantra"
}
