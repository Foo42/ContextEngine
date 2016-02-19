FROM node

WORKDIR /src

ADD package.json /src/
RUN npm install
ADD . /src

EXPOSE 9005
ENV NODE_ENV production
CMD ["node", "."]
