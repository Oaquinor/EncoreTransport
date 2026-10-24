# Live network

The public endpoint is `GET /api/v1/network/live`.

It returns a compact public payload containing configured route summaries,
active trips with a latest real driver location, bus public code, direction,
status, departure, estimated arrival and location timestamp. Driver identity,
user identifiers, contact information and private notes are intentionally
excluded.

The website loads this endpoint only when the network map approaches the
viewport, initializes Leaflet once, updates existing vehicle markers every 25
seconds while the page is visible, and pauses polling when the tab is hidden.
Trips without a real latest location are not presented as moving vehicles.
