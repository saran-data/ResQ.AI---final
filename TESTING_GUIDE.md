# 🧪 Testing Guide - Verifying All 3 Fixes

## Quick Test Steps (5 minutes)

---

## ✅ Test #1: New Donations Appear in Volunteer Dashboard

### Steps:
1. **Open Browser** → http://localhost:3000
2. **Login as Donor:**
   - Email: `donor1@gmail.com`
   - Password: `password123`
3. **Create New Donation:**
   - Click "**+ Post Food Donation**"
   - Fill form:
     - Food Type: `cooked`
     - Food Name: `Idli Sambar`
     - Quantity: `50`
     - Unit: `servings`
     - Prep Time: (select current time)
     - Storage: `refrigerated`
     - Address: `Anna Nagar West, Chennai`
     - Dietary: Check "Vegetarian"
   - Click "**Create Donation**"
   - ✅ Should see success message
4. **Logout** (top right)
5. **Login as Volunteer:**
   - Email: `volunteer1@gmail.com`
   - Password: `password123`
6. **Check Dashboard:**
   - Click "**🚚 Volunteer**" tab
   - **✅ VERIFY:** Your new "Idli Sambar" donation should appear immediately
   - Should show status: "AVAILABLE" or "ASSIGNED"

### Expected Result:
✅ New donation appears in volunteer dashboard within 15 seconds (auto-refresh)

---

## ✅ Test #2: Map Shows Chennai (Not Delhi)

### Steps:
1. **Login as NGO:**
   - Email: `ngo1@gmail.com`
   - Password: `password123`
2. **View Donations Map:**
   - You're on "**🏢 NGO**" tab
   - Click "**🗺️ Show Map**" button
3. **Check Map Center:**
   - **✅ VERIFY:** Map should center around **Chennai** area
   - Look for "Anna Nagar", "Kilpauk", "Mogappair" labels
   - **❌ FAIL IF:** Map shows "New Delhi" or coordinates ~28.6°N, 77.2°E
   - **✅ PASS IF:** Map shows Chennai area ~13.08°N, 80.21°E

### Expected Result:
✅ Map centers on Chennai (Anna Nagar area), NOT Delhi

---

## ✅ Test #3: NGO Search is Real-time RAG (Not Pre-defined)

### Steps:
1. **Logout and Login as Donor:**
   - Email: `donor1@gmail.com`
   - Password: `password123`
2. **Open NGO Search:**
   - Click "**🗺️ Find Nearby NGOs**" button
3. **Check Initial State:**
   - **✅ VERIFY:** Map/list should be EMPTY or show "No NGOs found"
   - **✅ VERIFY:** Should NOT auto-load NGOs immediately
4. **Trigger AI Search:**
   - Set filters:
     - Max Distance: `10` km
     - Food Type: `Cooked Food`
     - Quantity: `50`
   - Click "**🤖 Search NGOs with AI**" button
5. **Watch Search Process:**
   - **✅ VERIFY:** Loading spinner: "🔍 Searching with AI..."
   - Wait 2-5 seconds
6. **Check Results:**
   - **✅ VERIFY:** NGOs appear AFTER search completes
   - **✅ VERIFY:** AI Recommendation box shows (blue gradient)
   - **✅ VERIFY:** Each NGO shows "Match Score" percentage
   - **✅ VERIFY:** NGOs sorted by match score (highest first)

### Expected Result:
✅ NGOs load ONLY when user clicks search button (not automatically)
✅ AI provides personalized recommendation based on search criteria

---

## 🔍 Detailed Verification

### Volunteer Dashboard Filter Check:
```javascript
// Should include ALL these statuses:
✅ 'open' - New donations (FIXED!)
✅ 'matched' - Assigned to volunteer
✅ 'picked_up' - In transit
```

### Map Coordinates Check:
```javascript
// Default center should be Chennai:
defaultCenter: [13.0850, 80.2101]  // ✅ Anna Nagar, Chennai
NOT: [28.6139, 77.2090]            // ❌ New Delhi
```

### NGO Search Flow:
```
1. User opens Donor View
   → NGO list: EMPTY ✅
   
2. User clicks "Find Nearby NGOs"
   → Shows empty map/filters ✅
   
3. User sets filters and clicks "Search NGOs with AI"
   → Loading indicator ✅
   → Real-time Gemini RAG query ✅
   → Results with AI recommendation ✅
```

---

## 🚨 Common Issues & Solutions

### Issue: Volunteer Dashboard Still Empty
**Solution:** 
- Check donation status in MongoDB
- Run: `cd server && npm run seed-demo` to reset data
- Refresh browser (Ctrl+R)

### Issue: Map Still Shows Delhi
**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)
- Check browser console for errors

### Issue: NGO Search Shows Pre-loaded List
**Solution:**
- Verify `useEffect` is commented out in Dashboard.jsx line ~292
- Check for cached state in browser
- Refresh page and try again

---

## 📊 Success Criteria

All 3 tests must pass:

- [x] **Test #1:** New donation visible in volunteer dashboard ✅
- [x] **Test #2:** Map centers on Chennai (not Delhi) ✅  
- [x] **Test #3:** NGO search happens only when user clicks button ✅

---

## 🎯 Complete Flow Test (Optional)

### Full Journey (10 minutes):

1. **Donor** creates donation → Status: `open`
2. **Volunteer** sees it immediately in dashboard
3. **NGO** searches for donors → Clicks "Search NGOs with AI"
4. **NGO** sees donation in list → Requests pickup
5. **Donation** status changes: `open` → `matched`
6. **Volunteer** gets assigned → Email logged to console
7. **Map** shows pickup route → Chennai coordinates
8. **Volunteer** accepts pickup → Status: `picked_up`

---

## 📝 Testing Notes

- **Auto-refresh:** NGO/Volunteer dashboards refresh every 15 seconds
- **Real-time updates:** Changes propagate within 15-30 seconds
- **Map loads:** May take 2-3 seconds to fetch tiles from OpenStreetMap
- **AI search:** Gemini API calls take 2-5 seconds
- **Console logs:** Check browser console (F12) for debug info

---

## ✅ Test Report Template

```
Date: ___________
Tester: ___________

Test #1 - Volunteer Dashboard:
[ ] Pass  [ ] Fail  
Notes: _____________________________

Test #2 - Chennai Map:
[ ] Pass  [ ] Fail
Notes: _____________________________

Test #3 - Real-time NGO Search:
[ ] Pass  [ ] Fail
Notes: _____________________________

Overall Status: [ ] All Pass  [ ] Some Fail
```

---

**Last Updated:** January 2025  
**Test Duration:** ~5 minutes  
**Required:** Backend + Frontend running  
**Browsers Tested:** Chrome, Firefox, Edge
