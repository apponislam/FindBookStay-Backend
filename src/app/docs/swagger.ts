import { Router, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swaggerSpec";

const router = Router();

// Custom CSS for FindBookStay signature theme (#073B35 & #10B981)
const customCss = `
    .swagger-ui .topbar { 
        background-color: #073B35 !important; 
        border-bottom: 3px solid #10B981; 
        padding: 14px 0;
    }
    .swagger-ui .topbar-wrapper img {
        content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="32" viewBox="0 0 180 32"><text x="0" y="24" fill="%23ffffff" font-size="20" font-weight="800" font-family="sans-serif">FindBook<tspan fill="%2310B981">Stay</tspan></text></svg>') !important;
        height: 30px;
    }
    .swagger-ui .topbar a {
        font-weight: 700;
        font-size: 18px;
    }
    .swagger-ui .info h2.title {
        color: #073B35;
        font-weight: 800;
    }
    .swagger-ui .opblock.opblock-post {
        border-color: #10B981;
        background: rgba(16, 185, 129, 0.05);
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
        background: #059669;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
        background: #073B35;
    }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method {
        background: #d97706;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
        background: #dc2626;
    }
    .swagger-ui .btn.authorize {
        background-color: #073B35;
        border-color: #073B35;
        color: #ffffff;
    }
    .swagger-ui .btn.authorize svg {
        fill: #10B981;
    }
    .swagger-ui .btn.execute {
        background-color: #073B35;
        border-color: #073B35;
        color: #ffffff;
    }
`;

const swaggerOptions: swaggerUi.SwaggerOptions = {
    customCss,
    customSiteTitle: "FindBookStay API Docs",
    customfavIcon: "https://findbookstay.com/favicon.ico",
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        docExpansion: "none",
        defaultModelsExpandDepth: 2,
    },
};

// Serve raw JSON OpenAPI spec for Postman / Insomnia / frontend codegen tools
router.get("/swagger.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

// Serve interactive Swagger UI
router.use("/", swaggerUi.serve);
router.get("/", swaggerUi.setup(swaggerSpec, swaggerOptions));

export const swaggerRouter = router;
export { swaggerSpec };
