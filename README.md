# CavTory: AI-Powered Pantry & Inventory Management

## The Origin
**CavTory** is a portmanteau of *La Cave* (the traditional European cellar or basement storage space) and *Inventory*. It is designed specifically to bridge the gap between physical storage constraints and modern data management.

## The Problem
In Switzerland and across much of Europe, residential storage and apartment pantry space is highly constrained. Simultaneously, it is a common practice to cross borders to purchase bulk groceries, specialized items, and household goods at lower price points. This creates a distinct logistical challenge: managing a high-density, rapidly fluctuating home inventory—often kept in a separate basement *cave*—without over-purchasing or losing track of stock.

## The Solution
CavTory is a mobile-first, full-stack inventory application engineered to streamline home supply chain management. By leveraging AI image recognition, the application eliminates manual data entry. Users simply snap a photo of a product, and the system automatically extracts the item's name, brand, volume, and product type, committing it directly to a structured relational database. 

## Key Features
* **AI-Driven Data Entry:** Direct integration with Google Gemini to analyze mobile camera uploads and extract structured JSON data (Name, Brand, Size, Product Type).
* **Mobile-Optimized Staging:** In-browser camera access with a temporary preview UI, preventing API waste and keeping user device galleries clean.
* **Multi-Tier Data Aggregation:** A fast, client-side React drill-down interface where users can filter a live PostgreSQL dataset from high-level categories down to specific product lists instantly.
* **Cloud-Native Architecture:** Fully containerized and deployed on Railway for zero-downtime continuous integration.

## Tech Stack
* **Frontend:** React, Vite, TypeScript, Tailwind CSS
* **Backend:** Python, FastAPI, Pydantic
* **Database:** PostgreSQL
* **Infrastructure & Hosting:** Railway
* **AI Engine:** Google Gemini API

## System Architecture 
* **Client Layer:** The React frontend handles local state, camera hardware access, and data aggregation for UI performance.
* **API Gateway:** FastAPI routes process incoming Base64 image streams, enforce CORS protocols, and handle AI payload validation.
* **Data Pipeline:** The backend communicates with the Gemini API for data extraction, transforms the JSON response, and executes CRUD operations against the PostgreSQL database.

## Future Roadmap
* Implementation of low-stock predictive alerts based on consumption rates.
* Batch scanning capabilities for processing multiple items in a single API call.
