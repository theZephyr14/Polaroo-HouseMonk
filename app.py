import streamlit as st
import pandas as pd
import subprocess
import re
import json

st.set_page_config(page_title="Polaroo Processor", page_icon="🏠", layout="wide")

# Initialize session state
if 'results' not in st.session_state:
    st.session_state.results = None
if 'period' not in st.session_state:
    st.session_state.period = None
if 'overages' not in st.session_state:
    st.session_state.overages = None

st.title("🏠 Polaroo Batch Processor")
st.markdown("Process first 5 properties from Book1.xlsx")

# Show Book1.xlsx preview
try:
    df = pd.read_excel('Book1.xlsx')
    st.markdown("#### 📖 First 5 Properties:")
    first_5 = df.head(5)[['name', 'rooms']].rename(columns={'name': 'Property', 'rooms': 'Rooms'})
    st.dataframe(first_5, width=500)
except:
    st.warning("Could not load Book1.xlsx")

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

# Process period if selected and no results yet
if st.session_state.period and not st.session_state.results:
    with st.spinner(f"🤖 Processing {st.session_state.period}... Chrome will open!"):
        try:
            result = subprocess.run(
                ['node', 'process-10-properties.js', st.session_state.period],
                capture_output=True, text=True, timeout=300, encoding='utf-8', errors='ignore'
            )
            
            if result.returncode == 0:
                # Parse results using emitted RESULT_JSON lines for accuracy
                lines = result.stdout.split('\n')
                results_data = []
                json_items = []
                for line in lines:
                    if 'RESULT_JSON:' in line:
                        try:
                            json_str = line.split('RESULT_JSON:')[1].strip()
                            obj = eval(json_str)
                            json_items.append(obj)
                        except Exception:
                            pass
                # Fallback to legacy table parsing if needed
                if json_items:
                    for item in json_items:
                        results_data.append({
                            "Property": item.get("property"),
                            "Rooms": item.get("rooms"),
                            "Status": item.get("status"),
                            "⚡ Electricity": item.get("electricity_bills", 0),
                            "💧 Water": item.get("water_bills", 0),
                            "💰 Total": item.get("total_cost"),
                            "selected_bills": item.get("selected_bills", [])
                        })
                else:
                    table_started = False
                    for line in lines:
                        clean_line = re.sub(r'\x1b\[[0-9;]*m', '', line)
                        if "Property" in clean_line and "Status" in clean_line:
                            table_started = True
                            continue
                        elif "GRAND TOTAL" in clean_line:
                            break
                        elif table_started and "│" in clean_line and not clean_line.startswith("├") and not clean_line.startswith("└"):
                            parts = [p.strip() for p in clean_line.split("│") if p.strip()]
                            if len(parts) >= 6:
                                try:
                                    results_data.append({
                                        "Property": parts[1],
                                        "Rooms": int(parts[2]),
                                        "Status": parts[3],
                                        "⚡ Electricity": int(parts[4]),
                                        "💧 Water": int(parts[5]),
                                        "💰 Total": parts[6]
                                    })
                                except:
                                    pass
                
                st.session_state.results = results_data
                st.rerun()
            else:
                st.error("Processing failed")
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
            
            # Determine months in selected period (our buttons are all 2-month periods)
            period_label = st.session_state.period or ""
            two_month_periods = {"Jan-Feb", "Mar-Apr", "May-Jun", "Jul-Aug", "Sep-Oct", "Nov-Dec"}
            months_in_period = 2 if period_label in two_month_periods else 1

            for _, row in df.iterrows():
                if any(s in str(row["Status"]) for s in ["OK", "Success", "✅", "success"]):
                    allowance_per_month = calculate_allowance(row["Rooms"], row["Property"])
                    
                    # Find the selected bills for this property to calculate monthly overuse
                    property_data = next((r for r in st.session_state.results if r["Property"] == row["Property"]), None)
                    selected_bills = property_data.get("selected_bills", []) if property_data else []
                    
                    # Calculate monthly overuse from individual bills
                    monthly_overuse = []
                    total_overuse = 0
                    
                    for bill in selected_bills:
                        try:
                            # Extract month from bill dates
                            initial_date = bill.get('Initial date', '')
                            final_date = bill.get('Final date', '')
                            bill_cost = float(bill.get('Total', '0').replace('€', '').replace(',', '.').strip())
                            
                            if initial_date and final_date and '/' in initial_date:
                                # Parse dates to get month
                                parts = initial_date.split('/')
                                if len(parts) >= 2:
                                    month = int(parts[1])
                                    
                                    # Calculate overuse for this month
                                    month_overuse = max(0, bill_cost - allowance_per_month)
                                    
                                    if month_overuse > 0:
                                        monthly_overuse.append({
                                            'month': month,
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
                        # Show properties within limit
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
                
                # Single action under overuse: Download invoices (local only)
                if st.button("📥 Download invoices", use_container_width=True, key="download_invoices_overuse_tab"):
                    with st.spinner("📥 Downloading invoices..."):
                        try:
                            # Run invoice download script (no Supabase upload)
                            import subprocess
                            download_result = subprocess.run(
                                ['node', '-e', f'''
                                const downloader = require('./download_invoices.js');
                                const list = {st.session_state.overages["properties_with_overages"]};
                                const period = "{st.session_state.period}";
                                const props = list.map(p => ({{...p, period}}));
                                downloader.downloadInvoicesForOverageProperties(props).then(r => {{
                                  console.log('DONE:', JSON.stringify(r));
                                }}).catch(err => {{ console.error('ERR:', err.message); }});
                                '''],
                                capture_output=True, text=True, cwd='.', timeout=600
                            )
                            if download_result.returncode == 0:
                                st.success("✅ Download complete.")
                                st.code(download_result.stdout)
                            else:
                                st.error("❌ Download failed")
                                st.code(download_result.stderr)
                        except Exception as e:
                            st.error(f"Download error: {e}")
                
                # Move send-to-HouseMonk to the Invoices tab (tab3). Keep overuse tab lean.
                
                total_overuse = sum([float(item["Total Overuse"].replace("€", "").strip()) for item in overages_only])
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("🚨 Over Limit", len(overages_only))
                with col2:
                    st.metric("💰 Total Overuse", f"{total_overuse:.2f} €")
                with col3:
                    st.metric("📊 Avg Overage", f"{total_overuse/len(overages_only):.2f} €")
                
                # Remove old secondary download flow
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

            # Download invoices button (same behavior as Overuse tab)
            if st.button("📥 Download invoices", use_container_width=True, key="download_invoices_invoices_tab"):
                with st.spinner("📥 Downloading invoices..."):
                    try:
                        import subprocess
                        download_result = subprocess.run(
                            ['node', '-e', f'''
                            const downloader = require('./download_invoices.js');
                            const list = {overage_rows};
                            const period = "{st.session_state.period}";
                            const props = list.map(p => ({{...p, period}}));
                            downloader.downloadInvoicesForOverageProperties(props).then(r => {{
                              console.log('DONE:', JSON.stringify(r));
                            }}).catch(err => {{ console.error('ERR:', err.message); }});
                            '''],
                            capture_output=True, text=True, cwd='.', timeout=600
                        )
                        if download_result.returncode == 0:
                            st.success("✅ Download complete.")
                            st.code(download_result.stdout)
                        else:
                            st.error("❌ Download failed")
                            st.code(download_result.stderr)
                    except Exception as e:
                        st.error(f"Download error: {e}")

            st.markdown("##### 🚀 Send to HouseMonk")
            st.write("Creates due invoices in HouseMonk and uploads PDFs + JSON to AWS in one go.")
            if st.button("📤 Send to HouseMonk", use_container_width=True, key="send_to_housemonk_invoices_tab"):
                try:
                    # Discover local PDFs (invoice PDFs)
                    import os, subprocess
                    pdfs = [f for f in os.listdir('.') if f.lower().endswith('.pdf') and 'invoice' in f.lower()]
                    attached = pdfs[:1]  # attach first pdf if present

                    # Auto-discover available homes in project
                    import subprocess
                    discover_result = subprocess.run([
                        'node', '-e', '''
                        const axios = require("axios");
                        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
                        const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
                        axios.get("https://dashboard.thehousemonk.com/api/home?project=6846923ef48a1a068bc874ce&limit=10", {
                            headers: { authorization: token, "x-api-key": clientId }
                        }).then(r => {
                            const homes = r.data.rows.slice(0, 2); // Take first 2 homes
                            console.log("HOMES:", JSON.stringify(homes.map(h => ({
                                homeId: h._id,
                                projectId: h.project,
                                listingId: h.listing?._id || h.listing || "none",
                                name: h.name || h.address || "Unnamed"
                            }))));
                        }).catch(e => console.log("ERROR:", e.message));
                        '''
                    ], capture_output=True, text=True, cwd='.')
                    
                    if discover_result.returncode == 0:
                        try:
                            # Parse the discovered homes
                            output_lines = discover_result.stdout.split('\n')
                            for line in output_lines:
                                if "HOMES:" in line:
                                    homes_json = line.split("HOMES:")[1].strip()
                                    units = eval(homes_json)
                                    break
                            else:
                                # Fallback to hardcoded units
                                units = [
                                    {"homeId": "67c98e146f22e318a3ff480b", "projectId": "6846923ef48a1a068bc874ce", "listingId": "none", "name": "Unit A"},
                                    {"homeId": "67c98e146f22e318a3ff482b", "projectId": "6846923ef48a1a068bc874ce", "listingId": "none", "name": "Unit B"}
                                ]
                        except:
                            # Fallback to hardcoded units
                            units = [
                                {"homeId": "67c98e146f22e318a3ff480b", "projectId": "6846923ef48a1a068bc874ce", "listingId": "none", "name": "Unit A"},
                                {"homeId": "67c98e146f22e318a3ff482b", "projectId": "6846923ef48a1a068bc874ce", "listingId": "none", "name": "Unit B"}
                            ]
                    else:
                        # Fallback to hardcoded units
                        units = [
                            {"homeId": "67c98e146f22e318a3ff480b", "projectId": "6846923ef48a1a068bc874ce", "listingId": "none", "name": "Unit A"},
                            {"homeId": "67c98e146f22e318a3ff482b", "projectId": "6846923ef48a1a068bc874ce", "listingId": "none", "name": "Unit B"}
                        ]
                    # Minimal mapping from property names to listing IDs (extend as needed)
                    name_to_listing = {
                        "Aribau 1º 1ª": "68d1508efa8e72033f3917d0",
                        "Aribau 1º 2ª": "68d150d6fa8e72033f391ac6",
                    }

                    # If user selected rows, build targets from them; else fallback to auto-discovered units
                    targets = []
                    if selected_props:
                        # Build by selected properties
                        for row in selected_props:
                            pname = row.get('name','')
                            listing_id = name_to_listing.get(pname)
                            if listing_id:
                                targets.append({ 'listingId': listing_id, 'name': pname, 'amount': float(row.get('overage',0)) })
                    else:
                        # Fallback to auto-discovered units with first overage amount
                        default_amount = 0
                        try:
                            default_amount = float(overage_rows[0].get('overage',0)) if overage_rows else 0
                        except Exception:
                            pass
                        for u in units:
                            targets.append({ 'listingId': u.get('listingId') if u.get('listingId')!='none' else None, 'name': u.get('name','Unit'), 'amount': default_amount, 'homeId': u.get('homeId'), 'projectId': u.get('projectId') })

                    logs = []
                    for t in targets:
                        # Compute amount from overages for this property if available; fallback 0
                        amount = t.get('amount', 0)
                        period = st.session_state.period or 'Unknown Period'

                        # If we discovered a listing, prefer using listing-based resolution
                        listing_for_run = t.get('listingId') if t.get('listingId') else None
                        if listing_for_run:
                            cmd = [
                                'node','create_invoice_with_files_from_listing.js',
                                listing_for_run,
                                str(amount),
                                f"Utilities Overuse - {period} - {t.get('name', 'Unit')}"
                            ]
                            if attached:
                                cmd.append(attached[0])
                            # Also attach any JSONs generated by the downloader step if present
                            if os.path.exists('aws_upload_results.json'):
                                try:
                                    import json as _json
                                    with open('aws_upload_results.json','r',encoding='utf-8') as jf:
                                        _ = _json.load(jf)
                                    # We don't need to pass JSON files by path (already uploaded),
                                    # but if you want to also attach local JSONs to invoice, list them here.
                                except Exception:
                                    pass
                        else:
                            # Fallback to direct create if listing absent
                            cmd = [
                                'node','create_invoice_with_pdf.js',
                                t['homeId'], t['projectId'], t['homeId'],
                                os.getenv('SAFE_USER_ID','67ec1e4f1bb7267e46be0fb1'),
                                os.getenv('UTILITIES_PRODUCT_ID','68b15aa477372108e6f7fc32'),
                                os.getenv('R10_TAX_ID','67ee293b1e08ab0d6c5a42b7'),
                                str(amount), f"Utilities Overuse - {period} - {t.get('name', 'Unit')}"
                            ]
                            if attached:
                                cmd.append(attached[0])

                        res = subprocess.run(cmd, capture_output=True, text=True)
                        logs.append(res.stdout + "\n" + res.stderr)
                    st.success("✅ Sent to HouseMonk. See logs below.")
                    for l in logs:
                        st.code(l)
                except Exception as e:
                    st.error(f"Failed: {e}")
        else:
            st.info("Process data and calculate overages first to see invoice options")
    
    # Reset button
    if st.button("🔄 Process New Period"):
        st.session_state.results = None
        st.session_state.period = None
        st.session_state.overages = None
        st.rerun()

elif not st.session_state.period:
    st.info("👆 Click a period button above to start processing!")

st.markdown("---")
st.markdown("### 🎯 Complete Workflow:")
st.markdown("""
1. **📊 Data Tab**: Click period → Chrome opens → Extracts utility bills for 5 properties
2. **🧮 Calculate**: Click Calculate Overages → Analyzes allowances vs actual costs  
3. **🚨 Overuse Tab**: Shows properties exceeding limits
4. **📥 Download**: Click Download Invoices → Downloads PDFs from Polaroo → Uploads to Supabase
5. **📋 Invoices Tab**: Shows invoice management and Supabase storage info
""")
