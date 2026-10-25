# Handiwave Request-to-Bid Marketplace Blueprint

## Product decision

Handiwave should use a hybrid marketplace rather than forcing every service into one booking model.

1. **Request and sealed bids** for repairs, installations, custom work, and jobs where the final scope is uncertain.
2. **Inspection-first offers** when a professional cannot responsibly price the work without visiting.
3. **Instant fixed-price booking** for predictable services such as standard haircuts, grooming, routine cleaning, and basic servicing.

This keeps competition useful without turning Handiwave into a lowest-price auction.

## Why the current flow should change

The current app asks a customer to choose a professional before creating a booking. That works for direct repeat bookings, but it creates friction for a first-time customer who does not yet know which professional is suitable.

The existing quote, escrow, messaging, completion, review, and dispute features should remain. A request-to-bid layer should sit before them:

`Customer request -> diagnosis -> matched professionals -> sealed offers -> customer selects -> booking + conversation -> escrow -> service -> review`

Direct booking should remain available from a professional's profile.

## Customer flow

### 1. Choose what is needed

The customer selects a service and a simple intent:

- Repair a fault
- Install something
- Service or maintain something
- Request a new/custom job
- Book a standard appointment

### 2. Guided diagnosis

Handiwave asks short service-specific questions. The goal is not to pretend the customer is a technician. The goal is to give professionals enough information to decide whether they can help and what type of price they can offer.

Every request collects:

- Plain-language problem description
- Location and service radius
- Preferred date/time and urgency
- Photos and an optional short video
- Whether the item currently works at all
- Whether the customer already has materials or replacement parts
- Access constraints, safety concerns, and property type where relevant

The form should always offer **“I don't know”** and should never force the customer to diagnose the fault.

### 3. Smart request summary

Before publishing, Handiwave converts the answers into a clean job card:

- Service category
- Symptoms reported by customer
- Known item details
- Photos/video
- Location area, without exposing the exact address
- Preferred schedule
- Likely pricing route: fixed, estimated range, or inspection required
- Materials preference

The customer confirms that the summary is accurate.

### 4. Receive sealed offers

Only verified, available professionals who provide the service in the request area receive the opportunity. Each professional submits an offer without seeing competitors' prices.

The customer compares offers using:

- Price or estimated range
- Inspection fee, if required
- What is included and excluded
- Materials estimate
- Earliest availability
- Rating and completed Handiwave jobs
- Verification status
- Response time
- Workmanship guarantee offered

Handiwave may label a **Best fit**, but should not automatically label the cheapest offer as best.

### 5. Select and pay safely

Accepting an offer creates the normal Handiwave booking and private conversation. The accepted offer becomes the booking quote. The customer then pays into escrow where required.

All other offers close automatically and their professionals are notified politely.

## Professional flow

### Opportunity feed

Professionals see only jobs that match their verified services and operating area. Each card shows enough information to decide quickly:

- Service and issue summary
- Approximate area, not full address
- Preferred timing and urgency
- Customer photos/video
- Diagnosis answers
- Time left to respond
- Number of offers received, but not offer prices

### Three offer types

#### Fixed total

Use when the scope is clear. The professional submits labour, materials, total price, availability, completion time, inclusions, and guarantee.

#### Estimated range

Use when the likely problem is understood but final cost depends on what is found. The professional submits a minimum and maximum total, assumptions, labour estimate, and materials estimate. Any increase after inspection requires customer approval inside Handiwave.

#### Inspection required

Use when responsible diagnosis is impossible remotely. The professional submits an inspection/call-out fee, earliest visit time, what the inspection covers, and whether the fee will be deducted from the final job price.

## Messaging model

### Before selection

- Each interested professional can ask up to three short clarification questions.
- The customer's answers should be visible to all eligible bidders when they do not contain private information. This prevents the customer from answering the same technical question repeatedly.
- Exact address and phone number remain hidden.
- Professionals cannot send phone numbers, payment requests, or external links before selection.
- Handiwave prompts the customer when unanswered questions are blocking offers.

### After selection

- A private booking conversation opens automatically.
- The accepted offer is pinned at the top of the conversation.
- Price changes, materials approvals, schedule changes, and completion evidence use structured actions rather than informal chat only.
- Admin support can enter the conversation when needed, using the oversight access already implemented.

## Materials and price changes

For the pilot, Handiwave should not buy, stock, or deliver materials.

Use this workflow instead:

1. Professional marks materials as customer-provided or professional-provided.
2. Offer shows an estimated materials amount separately from labour.
3. After inspection, the professional submits a materials list and revised total if necessary.
4. Customer approves or rejects the change in the app.
5. Professional uploads receipts for significant material purchases.
6. Handiwave records every approved change for disputes and reviews.

A supplier marketplace can be introduced later after Handiwave has enough job-volume data to negotiate partnerships.

## Service-specific diagnosis examples

### Electrical

- What is affected: socket, light, appliance connection, breaker, room, or whole property?
- Is there power elsewhere?
- Any sparks, burning smell, heat, or exposed wire?
- When did it start?
- Upload a photo of the affected point and distribution board if safe.

Safety answers such as sparks or burning should show an emergency warning and tell the customer not to touch the installation.

### Plumbing

- Leak, blockage, low pressure, broken fitting, installation, or unknown?
- Is water still flowing?
- Can the water supply be shut off?
- Kitchen, bathroom, outdoor, or commercial location?
- Upload a photo/video.

### AC repair

- Split, window, standing, or central unit?
- Not cooling, not powering, leaking water, noisy, bad smell, or installation?
- Unit size if known.
- Last service date if known.
- Upload the indoor and outdoor unit.

### Generator repair

- Petrol or diesel?
- Capacity if known.
- Does it start?
- Does it produce power?
- Smoke, noise, fuel leak, overheating, or automatic changeover issue?
- Upload a start-up video if safe.

### Appliance or printer repair

- Brand and model if known.
- What happens when it is switched on?
- Error code or warning lights?
- Any unusual sound, smell, leak, paper jam, or physical damage?
- What happened immediately before the fault?
- Upload the label/model plate and a short video.

### Cleaning

- Home, office, shop, shortlet, or post-construction?
- Number of rooms/bathrooms and approximate size.
- Regular, deep, move-in/out, or post-construction clean?
- Customer or professional supplies materials?
- Any difficult stains, pets, or access restrictions?

### Barber

- Haircut, beard, children's cut, colouring, treatment, or home service?
- Number of people.
- Preferred style/reference photo.
- Home visit or professional's location?
- Preferred date/time.

Standard barber services should usually be fixed-price or instant-booked, not competitively bid.

### Hair stylist

- Braids, wig installation, natural hair, treatment, styling, or home service?
- Preferred style/reference photo.
- Hair length and current condition.
- Who supplies extensions/products?
- Preferred date/time and number of clients.

Complex styles may request offers; standard services can use a fixed menu.

## Fair competition rules

- Offers are sealed; professionals never see competitors' prices.
- Limit the first pilot to three to five offers per request.
- Rank by suitability, reliability, availability, and value—not price alone.
- Do not charge professionals merely to view a lead during the pilot.
- Penalise repeated no-shows, misleading low offers, off-platform payment attempts, and unexplained price increases.
- Reward fast, useful responses, accepted offers, completed jobs, strong reviews, and low cancellation rates.
- Rotate opportunity delivery so new verified professionals can compete without burying experienced professionals.
- Prevent professionals from bidding outside their verified categories and service areas.

## Professional engagement without unhealthy gamification

- Instant alerts for well-matched nearby opportunities.
- A daily opportunity digest for less urgent work.
- A clear response deadline.
- “Strong match” labels based on skill, distance, schedule, and history.
- Weekly performance summary: offers sent, responses, wins, completion rate, earnings, and customer rating.
- Helpful coaching when offers lose: incomplete scope, slow response, unavailable schedule, or price outside the customer's range. Never reveal another professional's exact offer.
- Reliability levels and category badges earned through completed jobs and verified evidence.

## Pilot rules for Kaduna and Abuja

- Start with verified professionals only.
- Match by service category, state/city, availability, and reasonable service radius.
- Send each request to a small batch first. Expand the batch if fewer than three suitable offers arrive within the response window.
- Urgent jobs use a shorter response window and prioritise currently available professionals.
- Requests close automatically after selection, cancellation, or expiry.
- Admin can pause unsafe or suspicious requests, remove inappropriate offers, and manually assist matching.

## Recommended launch categories

Launch request-to-bid first for:

- Electrical repairs
- Plumbing
- AC repair and installation
- Generator repair
- Appliance and printer repair
- Carpentry
- Painting
- Mechanic work

Launch fixed-price/appointment mode for:

- Barbers
- Hair stylists
- Routine cleaning
- Routine AC servicing

This includes beauty professionals now without forcing them into a repair-oriented experience.

## MVP data model

### Service requests

- Customer, service, status, urgency
- Issue title and description
- Structured diagnosis answers
- Location area and hidden full address
- Preferred schedule
- Materials preference
- Attachment references
- Expiry time

### Offers

- Request and professional
- Offer type: fixed, range, or inspection
- Labour amount
- Materials estimate
- Minimum/maximum total
- Inspection fee
- Availability and duration
- Inclusions, exclusions, assumptions, and guarantee
- Status: submitted, accepted, rejected, withdrawn, expired

### Clarifications

- Request, professional, sender, question/answer, timestamps
- Visibility control for public-to-bidders versus private support content

When an offer is accepted, Handiwave creates a booking, copies the accepted pricing into the existing quote fields, creates the conversation, and moves into the current escrow workflow.

## Pilot metrics

- Percentage of requests receiving at least three offers
- Median time to first useful offer
- Request-to-selection conversion
- Offer acceptance rate per professional
- Percentage requiring inspection
- Difference between estimated and final approved price
- Off-platform leakage reports
- Cancellation and no-show rates
- Completion and dispute rates
- Repeat customer and repeat professional activity

## Delivery sequence

### Phase 1: Marketplace foundation

- Customer request form with structured diagnosis
- Open opportunity feed for matched professionals
- Sealed fixed/range/inspection offers
- Customer offer comparison and selection
- Accepted offer converted into the existing booking and escrow flow

### Phase 2: Clarification and controlled changes

- Pre-selection clarification questions
- Structured materials list and price-change approval
- Admin request and offer oversight
- Better alerts and response deadlines

### Phase 3: Optimisation

- Best-fit ranking
- Service-specific fixed-price menus
- Professional performance coaching
- Supplier partnerships and material-price references
- Demand forecasting by area and category

## Final recommendation

Build Phase 1 around sealed offers and three pricing types. Keep direct booking as a secondary path. Include barbers and hair stylists now, but route their standard services through fixed-price appointments rather than repair-style bidding. Add pre-selection clarification immediately after the core bidding flow, because it is important but should not delay the foundation.
