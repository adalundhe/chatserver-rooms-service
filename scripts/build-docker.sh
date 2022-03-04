DOCKERFILE_PATH=${DOCKERFILE_PATH:-"./"}

docker build -t chat-rooms-server:latest \
 --no-cache \
 --target=run \
  ${DOCKERFILE_PATH}