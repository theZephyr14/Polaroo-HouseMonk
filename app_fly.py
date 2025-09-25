import streamlit as st
import pandas as pd
import subprocess
import re
import json
import os
import tempfile

st.set_page_config(page_title="Polaroo Processor", page_icon="🏠", layout="wide")

# Initialize session state
if 'results' not in st.session_state:
    st.session_state.results = None
if 'period' not in st.session_state:
    st.session_state.period = None
if 'overages' not in st.session_state:
    st.session_state.overages = None

st.title("🏠 Polaroo Batch Processor")
st.markdown("Process properties and create HouseMonk invoices")

# File upload for Book1.xlsx
uploaded_file = st.file_uploader("Upload Book1.xlsx", type=['xlsx'], key="book1_upload")

if uploaded_file is not None:
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
        tmp_file.write(uploaded_file.getbuffer())
        tmp_path = tmp_file.name
    
    try:
        df = pd.read_excel(tmp_path)
        st.markdown("#### 📖 First 5 Properties:")
        first_5 = df.head(5)[['name', 'rooms']].rename(columns={'name': 'Property', 'rooms': 'Rooms'})
        st.dataframe(first_5, width=500)
        
        # Store the dataframe in session state
        st.session_state.df = df
        st.session_state.tmp_path = tmp_path
    except Exception as e:
        st.error(f"Error reading file: {e}")
else:
    st.info("Please upload Book1.xlsx to continue")

# Period buttons
st.markdown("### Select Period:")
col1, col2, col3 = st.columns(3)

with col1:
    if st.button("Jan-Feb", use_container_width=True):
        st.session_state.period = "Jan-Feb"
        st.session_state.results = None
        st.session_state.overages = None
    if st.button("Jul-Aug", use_container_width=True):
        st.session_state.period = "Jul-Aug"
        st.session_state.results = None
        st.session_state.overages = None

with col2:
    if st.button("Mar-Apr", use_container_width=True):
        st.session_state.period = "Mar-Apr"
        st.session_state.results = None
        st.session_state.overages = None
    if st.button("Sep-Oct", use_container_width=True):
        st.session_state.period = "Sep-Oct"
        st.session_state.results = None
        st.session_state.overages = None

with col3:
    if st.button("May-Jun", use_container_width=True):
        st.session_state.period = "May-Jun"
        st.session_state.results = None
        st.session_state.overages = None
    if st.button("Nov-Dec", use_container_width=True):
        st.session_state.period = "Nov-Dec"
        st.session_state.results = None
        st.session_state.overages = None

# Mock data processing (since Chrome won't work on Fly.io)
if st.session_state.period and not st.session_state.results and 'df' in st.session_state:
    with st.spinner(f"🤖 Processing {st.session_state.period}... (Mock data for Fly.io)"):
        try:
            # Create mock results instead of running Chrome automation
            mock_results = []
            for _, row in st.session_state.df.head(5).iterrows():
                # Generate mock utility data
                import random
                electricity = random.randint(20, 80)
                water = random.randint(15, 60)
                total = electricity + water
                
                mock_results.append({
                    "Property": row["name"],
                    "Rooms": row["rooms"],
                    "Status": "OK",
                    "⚡ Electricity": electricity,
                    "💧 Water": water,
                    "💰 Total": total,
                    "selected_bills": [
                        {
                            "Service": "Electricity",
                            "Initial date": "01/01/2024",
                            "Final date": "31/01/2024",
                            "Total": f"{electricity}.00 €"
                        },
                        {
                            "Service": "Water", 
                            "Initial date": "01/01/2024",
                            "Final date": "31/01/2024",
                            "Total": f"{water}.00 €"
                        }
                    ]
                })
            
            st.session_state.results = mock_results
            st.rerun()
        except Exception as e:
            st.error(f"Error: {e}")

# Show results in tabs if available
if st.session_state.results:
    # Create 3 tabs
    tab1, tab2, tab3 = st.tabs(["📊 Data", "🚨 Overuse", "📋 Invoices"])
    
    df = pd.DataFrame(st.session_state.results)
    
    with tab1:
        st.markdown(f"#### 📊 Results for {st.session_state.period}")
        st.dataframe(df, width=800)
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("🏠 Properties", len(df))
        with col2:
            st.metric("✅ Successful", len(df[df["Status"].str.contains("OK|Success", na=False)]))
        with col3:
            st.metric("⚡ Electricity Bills", df["⚡ Electricity"].sum())
        with col4:
            st.metric("💧 Water Bills", df["💧 Water"].sum())
        
        # Calculate button
        if st.button("🧮 Calculate Overages", use_container_width=True):
            # Calculate overages
            def calculate_allowance(rooms, property_name=""):
                if "padilla" in property_name.lower() and "1-3" in property_name.lower():
                    return 150
                allowances = {1: 50, 2: 70, 3: 100, 4: 130}
                return allowances.get(rooms, 50)
            
            overage_data = []
            properties_with_overages = []
            
            # Determine months in selected period
            period_label = st.session_state.period or ""
            two_month_periods = {"Jan-Feb", "Mar-Apr", "May-Jun", "Jul-Aug", "Sep-Oct", "Nov-Dec"}
            months_in_period = 2 if period_label in two_month_periods else 1

            for _, row in df.iterrows():
                if any(s in str(row["Status"]) for s in ["OK", "Success", "✅", "success"]):
                    allowance_per_month = calculate_allowance(row["Rooms"], row["Property"])
                    
                    # Find the selected bills for this property
                    property_data = next((r for r in st.session_state.results if r["Property"] == row["Property"]), None)
                    selected_bills = property_data.get("selected_bills", []) if property_data else []
                    
                    # Calculate monthly overuse
                    monthly_overuse = []
                    total_overuse = 0
                    
                    for bill in selected_bills:
                        try:
                            bill_cost = float(bill.get('Total', '0').replace('€', '').replace(',', '.').strip())
                            month_overuse = max(0, bill_cost - allowance_per_month)
                            
                            if month_overuse > 0:
                                monthly_overuse.append({
                                    'month': 1,  # Mock month
                                    'cost': bill_cost,
                                    'overuse': month_overuse,
                                    'bill_type': bill.get('Service', 'Unknown')
                                })
                                total_overuse += month_overuse
                        except:
                            pass
                    
                    # Only show properties with actual overuse
                    if total_overuse > 0:
                        overage_data.append({
                            "Property": row["Property"],
                            "Rooms": row["Rooms"],
                            "Allowance (per month)": f"{allowance_per_month:.2f} €",
                            "Total Overuse": f"{total_overuse:.2f} €",
                            "Status": "🚨 Over Limit"
                        })
                        
                        properties_with_overages.append({
                            "name": row["Property"],
                            "overage": total_overuse,
                            "rooms": row["Rooms"],
                            "selected_bills": selected_bills,
                            "monthly_overuse": monthly_overuse
                        })
                    else:
                        overage_data.append({
                            "Property": row["Property"],
                            "Rooms": row["Rooms"],
                            "Allowance (per month)": f"{allowance_per_month:.2f} €",
                            "Total Overuse": "0.00 €",
                            "Status": "✅ Within Limit"
                        })
            
            st.session_state.overages = {
                "data": overage_data,
                "properties_with_overages": properties_with_overages
            }
            st.rerun()
    
    with tab2:
        st.markdown("#### 🚨 Overuse Analysis")
        
        if st.session_state.overages:
            overage_data = st.session_state.overages["data"]
            properties_with_overages = st.session_state.overages["properties_with_overages"]
            
            # Show all properties
            st.markdown("##### 📊 All Properties - Allowance vs Actual")
            overage_df = pd.DataFrame(overage_data)
            st.dataframe(overage_df, width=800)
            
            # Show only overages
            overages_only = [item for item in overage_data if float(item["Total Overuse"].replace("€", "").strip()) > 0]
            
            if overages_only:
                st.markdown("##### 🚨 Properties Exceeding Allowance")
                overages_df = pd.DataFrame(overages_only)
                st.dataframe(overages_df, width=800)

                # Single action under overuse: Download invoices (mock for Fly.io)
                if st.button("📥 Download invoices", use_container_width=True, key="download_invoices_overuse_tab"):
                    with st.spinner("📥 Downloading invoices... (Mock for Fly.io)"):
                        st.success("✅ Mock download complete. In a real environment, this would download PDFs from Polaroo.")
                
                total_overuse = sum([float(item["Total Overuse"].replace("€", "").strip()) for item in overages_only])
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("🚨 Over Limit", len(overages_only))
                with col2:
                    st.metric("💰 Total Overuse", f"{total_overuse:.2f} €")
                with col3:
                    st.metric("📊 Avg Overage", f"{total_overuse/len(overages_only):.2f} €")
                
            else:
                st.success("✅ All properties within limits!")
            
            # Show allowance rules
            st.markdown("##### 🧮 Allowance Rules:")
            st.info("""
            **Standard Allowances:**
            - **1 room**: €50
            - **2 rooms**: €70  
            - **3 rooms**: €100
            - **4 rooms**: €130
            
            **Exception:**
            - **Padilla 1-3**: €150
            """)
        else:
            st.info("Click 'Calculate Overages' in the Data tab first")
    
    with tab3:
        st.markdown("#### 📋 Invoices")
        if st.session_state.overages and st.session_state.overages["properties_with_overages"]:
            overage_rows = st.session_state.overages["properties_with_overages"]

            # Show Overuse table with selection
            st.markdown("##### 🚨 Overuse (select rows)")
            select_all = st.checkbox("Select all overuse rows", value=True, key="inv_tab_select_all")
            selected_props = []
            for i, row in enumerate(overage_rows):
                label = f"{row.get('name','Unknown')} — {row.get('overage',0):.2f} €"
                checked = st.checkbox(label, value=select_all, key=f"inv_row_{i}")
                if checked:
                    selected_props.append(row)

            # Download invoices button
            if st.button("📥 Download invoices", use_container_width=True, key="download_invoices_invoices_tab"):
                with st.spinner("📥 Downloading invoices... (Mock for Fly.io)"):
                    st.success("✅ Mock download complete. In a real environment, this would download PDFs from Polaroo.")

            st.markdown("##### 🚀 Send to HouseMonk")
            st.write("Creates due invoices in HouseMonk and uploads PDFs + JSON to AWS in one go.")
            
            # Show what would happen
            if st.button("📤 Send to HouseMonk", use_container_width=True, key="send_to_housemonk_invoices_tab"):
                if selected_props:
                    st.success(f"✅ Would send {len(selected_props)} invoices to HouseMonk!")
                    for prop in selected_props:
                        st.write(f"• {prop.get('name')} - {prop.get('overage', 0):.2f} €")
                    st.info("In a real environment, this would create invoices and upload files to AWS.")
                else:
                    st.warning("Please select at least one property to send to HouseMonk.")
        else:
            st.info("Process data and calculate overages first to see invoice options")
    
    # Reset button
    if st.button("🔄 Process New Period"):
        st.session_state.results = None
        st.session_state.period = None
        st.session_state.overages = None
        st.rerun()

elif not st.session_state.period:
    st.info("👆 Upload Book1.xlsx and click a period button above to start processing!")

st.markdown("---")
st.markdown("### 🎯 Complete Workflow:")
st.markdown("""
1. **📊 Data Tab**: Upload Book1.xlsx → Click period → Mock data processing (Chrome automation not available on Fly.io)
2. **🧮 Calculate**: Click Calculate Overages → Analyzes allowances vs actual costs  
3. **🚨 Overuse Tab**: Shows properties exceeding limits
4. **📥 Download**: Click Download Invoices → Mock PDF download (real implementation would download from Polaroo)
5. **📋 Invoices Tab**: Select properties → Send to HouseMonk → Mock invoice creation (real implementation would create invoices and upload to AWS)
""")

st.markdown("### ⚠️ Fly.io Limitations:")
st.warning("""
- **Chrome automation disabled**: Real Polaroo scraping not available
- **Mock data**: Using generated data instead of real utility bills
- **File persistence**: Uploaded files are temporary
- **Real HouseMonk integration**: Would work with proper credentials
""")
