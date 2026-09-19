# CNMechanic

**Modern Automotive Service. Built on Trust. Designed to Scale.**

CNMechanic is a modern automotive service platform built to transform an independent mechanic business into a scalable automotive brand.

The business begins with professional vehicle repair and maintenance, with a strong specialization in **European vehicles**, while continuing to service other makes and models.

The long-term goal is bigger than building a website for one mechanic shop.

CNMechanic is being developed as a digital-first automotive service platform that can expand into additional mechanics, service locations, mobile services, vehicle diagnostics, maintenance management, and other automotive services.

---

## 🚗 Our Mission

Finding a skilled and trustworthy mechanic should not be difficult.

CNMechanic is built around three principles:

**Trust. Transparency. Quality workmanship.**

Our mission is to combine experienced automotive professionals with modern technology to create a better way for vehicle owners to find, understand, schedule, and manage automotive services.

Technology supports the mechanic — it does not replace the mechanic.

---

## 🔧 What CNMechanic Does

CNMechanic provides automotive maintenance, diagnostics, and repair services.

The initial focus includes:

* European vehicle specialists
* BMW
* Mercedes-Benz
* Audi
* Volkswagen
* Volvo
* Porsche
* Land Rover / Range Rover
* MINI
* Other European brands
* Asian and American vehicles
* Engine diagnostics
* Check-engine-light diagnostics
* Electrical diagnostics
* Brake service
* Suspension and steering
* Cooling systems
* Oil and preventative maintenance
* Battery and charging systems
* Engine repair
* Vehicle inspections
* General automotive repair

Service availability will expand as the CNMechanic network grows.

---

# 🌎 Built Beyond One Location

CNMechanic begins with an experienced mechanic serving the Providence, Rhode Island market, but the software architecture and brand are being built for expansion.

The platform should never be architected as simply:

> “A local mechanic website.”

Instead, CNMechanic should be capable of evolving into:

**CNMechanic → Automotive Service Platform → Multi-Location Network**

Future expansion may include:

* Additional CNMechanic locations
* Independent mechanic partnerships
* Verified mechanic network
* Mobile mechanics
* Service-area expansion
* Fleet maintenance
* Roadside assistance integrations
* Vehicle maintenance histories
* Customer vehicle profiles
* Parts and service estimates
* Mechanic dashboards
* Multi-shop management
* Automotive service marketplace

The first location proves the model. The technology should support everything that comes afterward.

---

# 🏗 Technology Architecture

CNMechanic is a **fully owned, custom-built application**.

It should not depend on WordPress, Wix, Squarespace, Shopify, or another website-builder platform.

### Frontend

* React / Next.js
* TypeScript
* Responsive mobile-first interface
* Accessible UI
* Progressive enhancement
* Search-engine optimized architecture

### Infrastructure

**Cloudflare Pages**

Hosts and distributes the frontend through Cloudflare's global network.

**Cloudflare Workers**

Handles backend/API functionality, including:

* API endpoints
* Form processing
* Appointment requests
* Authentication middleware
* WebMCP endpoints
* Security controls
* Rate limiting
* External integrations

### Data Layer

**Supabase**

Used for:

* PostgreSQL database
* Authentication
* Customer accounts
* Vehicle records
* Service requests
* Appointments
* Mechanic profiles
* Service locations
* Reviews
* Administrative data
* Row Level Security

Sensitive credentials must never be exposed to the browser.

---

# 🤖 WebMCP & Agent-Ready Architecture

CNMechanic is designed to support the emerging agentic web.

WebMCP should be implemented as a first-class part of the architecture rather than added later as an experiment.

The objective is to make CNMechanic information understandable not only to traditional search engines but also to authorized AI agents and assistants.

Agent-accessible capabilities may eventually include:

* Discover services
* Find supported vehicle makes
* Search service locations
* Check business information
* Retrieve service descriptions
* Request appointments
* Retrieve public pricing information
* Find mechanics by specialization
* Search automotive knowledge
* Navigate location/service relationships

Any action that changes data, books services, accesses customer information, or performs another consequential operation must have appropriate authorization and validation.

WebMCP must never bypass normal application security.

---

# 🔎 SEO & Search Architecture

Organic discovery is a core product requirement.

SEO must be engineered into CNMechanic from the beginning.

The application should support:

* Server-renderable/indexable content where appropriate
* Semantic HTML
* Canonical URLs
* XML sitemap
* Robots directives
* Open Graph metadata
* Social metadata
* Structured data / JSON-LD
* Local business information
* Automotive service structured content
* Breadcrumbs
* Service pages
* Vehicle-make pages
* Location pages
* Internal linking
* Fast Core Web Vitals
* Image optimization
* Accessible image descriptions

The content architecture should allow combinations such as:

`/services/brake-repair`

`/services/engine-diagnostics`

`/vehicles/bmw`

`/vehicles/mercedes-benz`

`/vehicles/volvo`

`/locations/providence-ri`

As CNMechanic expands, the architecture should support relationships such as:

`Location × Service × Vehicle Make`

without generating low-quality or duplicate doorway pages.

The goal is useful, authoritative automotive content—not mass-generated SEO spam.

---

# 📍 Local Search

The first market is the **Providence, Rhode Island area**.

The initial implementation should establish strong local search signals while preserving the ability to add additional markets later.

Location data should therefore be database-driven rather than hard-coded throughout the application.

Each future location can have:

* Address
* Phone number
* Hours
* Service radius
* Services offered
* Vehicle specialties
* Mechanics
* Reviews
* Appointment availability
* Location-specific content

---

# 👤 Customer Experience

Customers should eventually be able to create an account and maintain their vehicles.

A customer garage may contain:

* Year
* Make
* Model
* Trim
* Mileage
* VIN where appropriate
* Service history
* Previous repairs
* Recommended maintenance
* Appointment history

This creates a continuing relationship between CNMechanic and the vehicle owner rather than treating every repair as an isolated transaction.

---

# 📅 Service & Appointment System

Customers should be able to request service through CNMechanic.

Typical flow:

**Choose Vehicle → Select Problem/Service → Describe Symptoms → Choose Location → Request Date → Submit**

The mechanic or shop can then:

* Review request
* Contact customer
* Accept
* Reschedule
* Reject
* Add internal notes
* Update service status

The system should not automatically promise diagnostic conclusions or final repair prices before a qualified mechanic evaluates the vehicle.

---

# 🛠 Administration

CNMechanic requires a secure administrative dashboard.

Authorized staff should be able to manage:

* Services
* Vehicle makes
* Locations
* Mechanics
* Appointment requests
* Customers
* Business hours
* Service areas
* Reviews/testimonials
* Website content
* SEO metadata
* Photos
* Leads
* Contact submissions

The objective is to allow the business to operate the platform without developers having to modify source code for ordinary business changes.

---

# 🧠 Responsible Use of AI

CNMechanic is **not an AI mechanic**.

AI may assist with:

* Search
* Content organization
* Administrative workflows
* Customer-service assistance
* SEO analysis
* Vehicle information retrieval
* Explaining common automotive terminology

AI must not replace professional diagnosis or represent uncertain information as a confirmed mechanical diagnosis.

Actual automotive diagnosis and repair decisions remain with qualified mechanics.

---

# 🔐 Security

Security must be designed into the platform from the beginning.

Requirements include:

* Supabase Row Level Security
* Server-side authorization
* Input validation
* API rate limiting
* Secure session handling
* Environment-based secrets
* CSRF protections where applicable
* XSS protections
* SQL injection protection
* Restricted administrative endpoints
* Audit logging for sensitive operations
* Least-privilege database permissions

No Supabase service-role key or privileged credential may be shipped to the client.

---

# 📈 Long-Term Vision

CNMechanic can eventually become infrastructure connecting:

**Drivers → Vehicles → Mechanics → Shops → Service History**

Possible future products include:

### CNMechanic Shops

Multi-location branded automotive service centers.

### CNMechanic Network

A network of vetted independent mechanics.

### CNMechanic Mobile

Mechanics who perform eligible services at customers' homes or workplaces.

### CNMechanic Garage

Digital vehicle ownership and maintenance records.

### CNMechanic Fleet

Maintenance management for commercial fleets.

### CNMechanic Marketplace

Discovery and booking across mechanics, shops, specialties, and locations.

These are future directions rather than commitments for the initial release.

---

# 🚀 Development Principles

Every implementation decision should follow these principles:

1. **Trust first**
2. **Human mechanic expertise first**
3. **Mobile first**
4. **SEO from day one**
5. **Agent-ready from day one**
6. **Security by default**
7. **No unnecessary AI dependency**
8. **No unnecessary third-party platform dependency**
9. **Build for multiple locations**
10. **Build for scale without overengineering the MVP**

---

# 🗺 Initial Roadmap

### Phase 1 — Foundation

Brand identity, production website, services, vehicle specialties, Providence market pages, contact system, service requests, SEO foundation, structured data, Cloudflare deployment, Supabase backend, WebMCP foundation, and administration.

### Phase 2 — Customer Platform

Customer accounts, vehicle garage, service history, improved appointment management, mechanic workflow, notifications, reviews, and customer dashboard.

### Phase 3 — Multi-Location

Location management, mechanic profiles, service territories, location-specific availability, centralized administration, and scalable search architecture.

### Phase 4 — CNMechanic Network

Independent mechanic onboarding, verification, mechanic dashboards, customer/mechanic matching, expanded booking infrastructure, and additional markets.

---

# 🏁 Current Status

**Status:** Early Development
**Initial Market:** Providence, Rhode Island, USA
**Primary Specialty:** European Vehicles
**Business Model:** Automotive Service + Scalable Service Platform
**Infrastructure:** Cloudflare + Supabase
**Frontend:** React / Next.js + TypeScript
**Backend:** Cloudflare Workers
**Agent Layer:** WebMCP

---

## CNMechanic

**European expertise. Honest service. Built to go further.**

© Tarvico Inc. All rights reserved.
