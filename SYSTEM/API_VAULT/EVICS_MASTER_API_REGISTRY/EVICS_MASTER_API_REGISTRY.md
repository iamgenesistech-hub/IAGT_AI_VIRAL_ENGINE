# EVICS MASTER API REGISTRY

Purpose:
Master infrastructure registry for all EVICS integrations, APIs, connectors, automation systems, AI systems, render systems, deployment systems, and ecommerce intelligence layers.

IMPORTANT:
Never store live secret keys in this documentation.
Store live secrets ONLY inside local `.env`.

====================================================
PRODUCTION SHOPIFY STORE
====================================================

Store Name:
I AM GENESIS TECH

PRIMARY PRODUCTION STORE:
iamgenesistech.myshopify.com

DO NOT USE:
i-am-genesis-tech.myshopify.com

Purpose:
Primary live ecommerce intelligence environment.

Core EVICS Connections:
- Shopify Admin API
- Product Sync
- Collection Sync
- Bundle Intelligence
- SKU Routing
- Inventory Intelligence
- Marketing Intelligence
- Render Deployment
- Campaign Tracking

Connector File:
utils/shopifyLiveConnector.js

Backend Routes:
- /api/shopify/products
- /api/shopify/collections

Environment Variables:
- SHOPIFY_STORE_DOMAIN
- SHOPIFY_ADMIN_ACCESS_TOKEN
- SHOPIFY_API_VERSION

Required API Scopes:
- read_products
- read_product_listings
- read_inventory
- read_locations
- read_collections

Future Scopes:
- read_orders
- read_customers
- read_marketing_events

Status:
ACTIVE DEVELOPMENT

====================================================
SUPABASE
====================================================

Project:
EVICS_IAGT_AI_DATABASE

Purpose:
Cloud AI intelligence database.

Project URL:
https://mvfkwlidwqcyqczlauii.supabase.co

Core Functions:
- Product Intelligence
- Render Intelligence
- Campaign Intelligence
- Trend Intelligence
- Authenticity Intelligence
- Reporting
- Automation Logging
- Performance Forecasting

Connector:
utils/supabaseConnector.js

Tables:
- evics_products
- evics_renders
- evics_campaigns
- evics_trends
- evics_authenticity_reviews

Status:
CONNECTED

====================================================
HAVE SYSTEM
====================================================

System Name:
Human Authenticity Verification Engine

Purpose:
Detect and reject AI-looking renders before deployment.

Core Functions:
- Facial realism grading
- Hand artifact detection
- Motion realism analysis
- Lighting realism
- Human behavior realism
- AI artifact rejection
- Deployment approval gate

Minimum Deployment Score:
99%

Status:
ACTIVE DEVELOPMENT

====================================================
OPENAI
====================================================

Purpose:
Reasoning, copywriting, strategic intelligence, automation assistance.

Future Functions:
- Agent orchestration
- Prompt engineering
- Content scoring
- Predictive reasoning
- Intelligence automation

Status:
PENDING

====================================================
HEYGEN
====================================================

Purpose:
Video rendering and avatar generation.

Future Functions:
- Human video rendering
- Marketing avatar systems
- AI spokesperson deployment
- Product commercial generation

Status:
PENDING

====================================================
CANVA
====================================================

Purpose:
Mass render template deployment.

Future Functions:
- Bulk product graphics
- Bundle templates
- Render deployment
- Social media generation

Status:
ACTIVE EXTERNAL TOOL

====================================================
TIKTOK
====================================================

Purpose:
Trend intelligence and viral forecasting.

Future Functions:
- Viral trend scraping
- Trend scoring
- Momentum prediction
- Campaign routing

Status:
PENDING

====================================================
META
====================================================

Purpose:
Advertising intelligence.

Future Functions:
- Ad scoring
- Campaign optimization
- ROAS prediction
- Creative fatigue detection

Status:
PENDING

====================================================
YOUTUBE
====================================================

Purpose:
Video deployment infrastructure.

Future Functions:
- Auto uploads
- Shorts routing
- Trend monitoring
- Engagement intelligence

Status:
PENDING

====================================================
CUSTOMER PORTAL
====================================================

Purpose:
Future white-label EVICS onboarding platform.

Future Functions:
- Customer onboarding
- Store connection wizard
- API onboarding
- Brand configuration
- AI system provisioning

Status:
FINAL PHASE DEVELOPMENT