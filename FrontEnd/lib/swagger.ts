import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "app/api", 
    definition: {
      openapi: "3.0.0",
      info: {
        title: "WADS Final Project API",
        version: "1.0.0",
        description: "API documentation for the WADS Final Project",
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ BearerAuth: [] }],
    },
  });
  return spec;
};