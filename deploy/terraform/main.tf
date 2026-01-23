# =============================================================================
# Pensaer-BIM Infrastructure (Google Cloud)
# terraform init && terraform plan && terraform apply
# =============================================================================

terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Backend for state storage (configure for your org)
  # backend "gcs" {
  #   bucket = "pensaer-terraform-state"
  #   prefix = "terraform/state"
  # }
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (staging, production)"
  type        = string
  default     = "staging"
}

# -----------------------------------------------------------------------------
# Provider
# -----------------------------------------------------------------------------
provider "google" {
  project = var.project_id
  region  = var.region
}

# -----------------------------------------------------------------------------
# VPC Network
# -----------------------------------------------------------------------------
resource "google_compute_network" "pensaer" {
  name                    = "pensaer-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "pensaer" {
  name          = "pensaer-${var.environment}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.pensaer.id

  private_ip_google_access = true
}

# -----------------------------------------------------------------------------
# Cloud SQL (PostgreSQL)
# -----------------------------------------------------------------------------
resource "google_sql_database_instance" "pensaer" {
  name             = "pensaer-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = var.environment == "production" ? "db-custom-2-8192" : "db-f1-micro"
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.environment == "production"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.pensaer.id
    }

    database_flags {
      name  = "max_connections"
      value = var.environment == "production" ? "200" : "50"
    }
  }

  deletion_protection = var.environment == "production"
}

resource "google_sql_database" "pensaer" {
  name     = "pensaer"
  instance = google_sql_database_instance.pensaer.name
}

resource "google_sql_user" "pensaer" {
  name     = "pensaer"
  instance = google_sql_database_instance.pensaer.name
  password = random_password.db_password.result
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}

# -----------------------------------------------------------------------------
# Redis (Memorystore)
# -----------------------------------------------------------------------------
resource "google_redis_instance" "pensaer" {
  name           = "pensaer-${var.environment}"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.environment == "production" ? 5 : 1
  region         = var.region

  authorized_network = google_compute_network.pensaer.id

  redis_version = "REDIS_7_0"
}

# -----------------------------------------------------------------------------
# Cloud Storage (for IFC files, exports)
# -----------------------------------------------------------------------------
resource "google_storage_bucket" "pensaer" {
  name     = "pensaer-${var.environment}-${var.project_id}"
  location = var.region

  uniform_bucket_level_access = true

  versioning {
    enabled = var.environment == "production"
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  cors {
    origin          = var.environment == "production" ? ["https://pensaer.io"] : ["*"]
    method          = ["GET", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# -----------------------------------------------------------------------------
# Cloud Run (API Server)
# -----------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "pensaer_server" {
  name     = "pensaer-server-${var.environment}"
  location = var.region

  template {
    scaling {
      min_instance_count = var.environment == "production" ? 2 : 0
      max_instance_count = var.environment == "production" ? 10 : 2
    }

    containers {
      image = "gcr.io/${var.project_id}/pensaer-server:latest"

      ports {
        container_port = 8000
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://pensaer:${random_password.db_password.result}@/${google_sql_database.pensaer.name}?host=/cloudsql/${google_sql_database_instance.pensaer.connection_name}"
      }

      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.pensaer.host}:6379"
      }

      env {
        name  = "STORAGE_BUCKET"
        value = google_storage_bucket.pensaer.name
      }

      resources {
        limits = {
          cpu    = var.environment == "production" ? "2" : "1"
          memory = var.environment == "production" ? "2Gi" : "512Mi"
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        initial_delay_seconds = 5
        timeout_seconds       = 3
        period_seconds        = 5
        failure_threshold     = 10
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        timeout_seconds = 3
        period_seconds  = 30
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.pensaer.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }
}

# VPC Connector for Cloud Run to access private resources
resource "google_vpc_access_connector" "pensaer" {
  name          = "pensaer-${var.environment}"
  region        = var.region
  network       = google_compute_network.pensaer.name
  ip_cidr_range = "10.8.0.0/28"
}

# Allow unauthenticated access (API handles auth)
resource "google_cloud_run_v2_service_iam_member" "pensaer_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.pensaer_server.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "api_url" {
  value = google_cloud_run_v2_service.pensaer_server.uri
}

output "database_connection" {
  value     = google_sql_database_instance.pensaer.connection_name
  sensitive = true
}

output "redis_host" {
  value = google_redis_instance.pensaer.host
}

output "storage_bucket" {
  value = google_storage_bucket.pensaer.name
}
