# T-165 — product opened from a seller's product list

Path: `/antojos` -> product -> its seller -> "Buñuelo" from the seller's
list. Same e2e build, signed out, desktop 1280x900.

- `product-from-seller-list__before.png` - the failure screenshot from
  `tests/e2e/seller-products-modal.spec.js` run against the old route: no
  seller name or logo, "No hay horarios disponibles", a "Disponible" badge
  for a closed seller, and a WhatsApp button whose href is
  `wa.me/+57?text=...` (no number).
- `product-from-seller-list__after.png` - the same path with the fix:
  "Arepas El Parche" with its logo, the three schedule rows, "Cerrado ahora ·
  abre lun 8:00", and a WhatsApp href with the seller's number.
