resource "aws_ecr_repository" "backend" {
  name                 = "stockmantra-backend"
  image_tag_mutability = "MUTABLE"
  # force_delete lets terraform destroy clean up even when images are present
  force_delete = true

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = { Project = var.cluster_name }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "stockmantra-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = { Project = var.cluster_name }
}
