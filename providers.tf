provider "helm" {
  alias              = "ziis"
  namespace          = "tiller"
  service_account    = "tiller"
  enable_tls         = true
  client_key         = "../kirk/helm_key.ziis.pem"
  client_certificate = "../kirk/helm_cert.ziis.pem"
  ca_certificate     = "../kirk/helm_cert_ca.ziis.pem"
}
