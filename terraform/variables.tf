variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name — also used as a name prefix for all resources"
  type        = string
  default     = "SM-EKS"
}
