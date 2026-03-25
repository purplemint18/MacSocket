import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My Todo App API",
      version: "1.0.0",
      description: "My Todo App API",
    },
    servers: [
      {
        url: "http://localhost:8000",
      },
    ],
  },
  apis: ["**/*.ts"],
};

const specs = swaggerJsdoc(options);

export default specs;
