module "img" {
  source   = "../kirk/docker_push"
  folder   = "."
  registry = "10.105.250.202:5000"
  image    = "kibblekhaos"
}
module "deploy" {
  source = "../kirk/simple"
  host   = "kibblekhaos.zi.is"
  image  = module.img.image
  providers = {
    helm = helm.ziis
  }
}
