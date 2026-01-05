# InventSync - TODO / Known Issues

This file documents bugs, issues, and feature requests for AI agents to work on later.

---

## 🐛 Bug: Delete Confirmation Popup Flashes Too Quickly

**Date Reported**: 2026-01-05  
**Priority**: Medium  
**Component**: Frontend - Products Page

### Description
When clicking the "Delete" button on a product in the products list page (`/products`), the browser's `confirm()` dialog flashes very briefly and disappears before the user can click "OK" or "Cancel". The product is not deleted.

### Expected Behavior
The confirmation dialog should remain visible until the user explicitly clicks OK or Cancel.

### Root Cause (Suspected)
The delete button might be inside a link or form that causes a navigation/submit event, which closes the confirm dialog. Or there may be a page re-render that interrupts the confirmation.

### File to Fix
- `apps/web/src/app/products/page.tsx` - the `deleteProduct` function and button

### Suggested Fix
1. Add `e.preventDefault()` and `e.stopPropagation()` to the delete button's onClick handler
2. Or use a custom modal component instead of browser's `confirm()`
3. Check if the button is wrapped in an `<a>` tag that causes navigation

### Code Location
```tsx
// In apps/web/src/app/products/page.tsx
<button
  onClick={() => deleteProduct(product.id)}  // May need event parameter
  className="text-red-600 hover:text-red-900"
>
  Delete
</button>
```

---

## ✅ Completed Items
- [x] Initial MVP with eBay integration
- [x] Product CRUD operations
- [x] eBay connection flow
- [x] List to eBay functionality
