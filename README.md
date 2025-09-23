# HouseMonk Integration System

## 🚀 Enhanced Integration with Auto-Refresh

This system provides a robust integration between Polaroo overuse analysis and HouseMonk invoice creation.

### Key Features

✅ **Auto-Refresh Authentication**: Automatically refreshes tokens when they expire  
✅ **ID Resolution**: Automatically resolves project, user, and contract IDs from unit ID  
✅ **Error Recovery**: Handles 401 errors gracefully with automatic retry  
✅ **Streamlit Integration**: One-click invoice creation from the web interface  

### Files

- `enhanced_housemonk_auth.js` - Core authentication and ID resolution classes
- `housemonk_integration.js` - Main integration script
- `test_enhanced_system.js` - Test script to verify functionality
- `app.py` - Streamlit web interface
- `mock_housemonk_server.js` - Mock server for testing

### Usage

1. **Test the system**: `node test_enhanced_system.js`
2. **Run integration**: `node housemonk_integration.js`
3. **Web interface**: `streamlit run app.py`

### Configuration

Update these values in `housemonk_integration.js`:
- Product ID for utilities
- Tax code ID for R10
- Unit ID for your property

### Authentication

The system automatically handles:
- Token refresh (monthly)
- 401 error recovery
- User access token generation
- ID resolution from unit ID

### Current Status

- ✅ Authentication system ready
- ✅ ID resolution working
- ✅ Invoice creation logic complete
- ✅ Streamlit integration ready
- ❌ Real API tokens needed (authentication failing)

### Next Steps

1. Get working authentication tokens from HouseMonk
2. Update product and tax IDs
3. Test with real API
4. Add PDF attachment functionality
