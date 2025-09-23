const axios = require("axios");

// Enhanced authentication with auto-refresh
class HouseMonkAuth {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.masterToken = null;
    this.userToken = null;
    this.tokenExpiry = null;
  }

  async refreshMasterToken() {
    try {
      console.log("🔄 Refreshing master token...");
      const response = await axios.post("https://dashboard.thehousemonk.com/api/client/refresh-token", {
        clientId: this.clientId,
        clientSecret: this.clientSecret
      });
      
      this.masterToken = response.data.token;
      this.tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      console.log("✅ Master token refreshed successfully");
      return this.masterToken;
    } catch (error) {
      console.log("❌ Failed to refresh master token:", error.response?.data?.message || error.message);
      throw error;
    }
  }

  async getUserAccessToken(userId) {
    try {
      if (!this.masterToken || this.isTokenExpired()) {
        await this.refreshMasterToken();
      }

      console.log(`🔑 Getting user access token for user: ${userId}`);
      const response = await axios.post("https://dashboard.thehousemonk.com/integration/glynk/access-token", {
        user: userId
      }, {
        headers: {
          "x-api-key": this.clientId,
          "authorization": `Bearer ${this.masterToken}`,
          "content-type": "application/json"
        }
      });

      this.userToken = response.data.accessToken;
      console.log("✅ User access token obtained");
      return this.userToken;
    } catch (error) {
      console.log("❌ Failed to get user access token:", error.response?.data?.message || error.message);
      throw error;
    }
  }

  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    return new Date() >= this.tokenExpiry;
  }

  async makeAuthenticatedRequest(method, url, data = null, useUserToken = false) {
    try {
      const token = useUserToken ? this.userToken : this.masterToken;
      
      if (!token || this.isTokenExpired()) {
        await this.refreshMasterToken();
        if (useUserToken) {
          await this.getUserAccessToken("6891dfbf052d1d7f336d0d62"); // Kevin's user ID
        }
      }

      const config = {
        method,
        url,
        headers: {
          "authorization": `Bearer ${useUserToken ? this.userToken : this.masterToken}`,
          "x-api-key": this.clientId,
          "content-type": "application/json"
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("🔄 401 Error - Attempting token refresh...");
        await this.refreshMasterToken();
        if (useUserToken) {
          await this.getUserAccessToken("6891dfbf052d1d7f336d0d62");
        }
        
        // Retry the request
        const retryConfig = {
          method,
          url,
          headers: {
            "authorization": `Bearer ${useUserToken ? this.userToken : this.masterToken}`,
            "x-api-key": this.clientId,
            "content-type": "application/json"
          }
        };
        if (data) retryConfig.data = data;
        
        return await axios(retryConfig);
      }
      throw error;
    }
  }
}

// ID Resolution System
class HouseMonkIDResolver {
  constructor(auth) {
    this.auth = auth;
    this.cache = new Map();
  }

  async resolveFromUnitId(unitId) {
    console.log(`🔍 Resolving IDs from unit ID: ${unitId}`);
    
    try {
      // Get home details
      const homeResponse = await this.auth.makeAuthenticatedRequest("GET", `https://dashboard.thehousemonk.com/api/home/${unitId}`);
      const home = homeResponse.data;
      
      const result = {
        unitId: unitId,
        homeId: home._id,
        projectId: home.project,
        listingId: home.listing,
        tenantId: home.tenant?._id || home.tenant,
        propertyName: home.name || home.address,
        tenantName: home.tenant?.firstName ? `${home.tenant.firstName} ${home.tenant.lastName}` : "Unknown"
      };

      console.log("✅ Resolved IDs:", result);
      this.cache.set(unitId, result);
      return result;
    } catch (error) {
      console.log("❌ Failed to resolve IDs from unit:", error.response?.data?.message || error.message);
      throw error;
    }
  }

  async getAvailableUnits() {
    console.log("📋 Fetching all available units...");
    
    try {
      const response = await this.auth.makeAuthenticatedRequest("GET", "https://dashboard.thehousemonk.com/api/home");
      const units = response.data.rows;
      
      console.log(`✅ Found ${units.length} units`);
      return units.map(unit => ({
        id: unit._id,
        name: unit.name || unit.address,
        project: unit.project,
        tenant: unit.tenant?.firstName ? `${unit.tenant.firstName} ${unit.tenant.lastName}` : "No tenant"
      }));
    } catch (error) {
      console.log("❌ Failed to fetch units:", error.response?.data?.message || error.message);
      throw error;
    }
  }
}

module.exports = { HouseMonkAuth, HouseMonkIDResolver };
