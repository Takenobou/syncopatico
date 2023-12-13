# syncopatico

## Hosting the go web server
Containerize all the server files with docker. Use a compose file to forward port 8080.  
Build using docker compose.  

Create a Google Cloud account and Google Cloud project.  
Create a repository in the Google Cloud Artifact Registry.  
Install Google Cloud CLI, initialize.  
> gcloud init

Configure docker with the region of your repository.  
> gcloud auth configure-docker *REGION*-docker.pkg.dev

Tag your local docker image with the location of your repository.  
Push the docker image to the repository location.  

Create a new VM instance template.  
Choose a machine type. Tested on e2-medium machines.  
In the Container section click "Deploy Container".  
As the container name enter the location of the image in your repository.  
> *REGION*-docker.pkg.dev/*PROJECT_ID*/*REPO_NAME*/*DOCKER_IMAGE*

Select "Run as privileged". Create.  

Select your created instance template and "Create Instance Group".  
Select "New managed (Stateless)".  
Select desired name and region for group.  
Add port mapping for port 8080.  
Leave other settings default.  

Go to cloud firewall policies.  
Create new rule.  
Target: All instances in network.  
Source IP: IP(s) hosting whiteboard application. 0.0.0.0/0 to allow all.  
Protocols and ports: Specified port: Tick TCP, port 8080. Create.  

Create a new TCP loadbalancer.  
From internet to VMs.  
Pick region setting based on isntance group region type.  
Type: Pass-through.  
Backend type: Target pool.  
Next.  
Select region that contains your instance group.  
Select your instance group.  
Session affinity: Client IP.  
Set frontend port as 8080. Create.  

Set the websocket request IP in the whiteboard application as the IP listed on the created loadbalancer with posrt 8080.  
