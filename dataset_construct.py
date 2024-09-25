'''
2024-09-25
Anna Su (anna.su@yale.edu)
This script builds a dataset of best resolution protein structures given a list of PDB IDs.
'''

import pandas as pd
import time
from data_scrape import fetch_pdb_data 

'''
Step 1: Loading query file and PDB IDs
'''
# Load the GraphQL query
with open('pdb_res_uniprot.graphql', 'r') as f:
    PDB_GRAPHQL_QUERY = f.read()

# Load your list of PDB IDs
with open('rcsb_pdb_ids_20240925072119.txt', 'r') as file:
    line = file.readline().strip()
    pdb_ids = line.split(',') 

# Print the number of PDB IDs
print(f'Number of PDB IDs: {len(pdb_ids)}')

'''
Step 2: Fetching PDB data 
'''

# Fetch PDB data in batches to avoid overloading the server, change batch_size if needed
def batch_fetch_pdb_data(pdb_ids, batch_size=20):
    all_data = {}
    for i in range(0, len(pdb_ids), batch_size):
        batch_ids = pdb_ids[i:i+batch_size]
        data = fetch_pdb_data(*batch_ids)
        if 'error' in data:
            print(f"Error fetching data for batch {i//batch_size + 1}: {data['error']}")
            continue
        all_data.update(data)
        time.sleep(1)  # Wait 1 second between batches
    return all_data

data = batch_fetch_pdb_data(pdb_ids, batch_size=20)

'''
Step 3: Saving the fetched data
'''

# Prepare fetched data for DataFrame
data_list = []
for pdb_id, pdb_data in data.items():
    resolution = pdb_data.get('resolution')
    uniprot_ids = pdb_data.get('uniprot_ids', [])
    for uniprot_id in uniprot_ids:
        data_list.append({
            'PDB_ID': pdb_id,
            'Resolution': resolution,
            'UniProt_ID': uniprot_id
        })

# Convert to DataFrame
df = pd.DataFrame(data_list)

# Save the DataFrame to a CSV file
df.to_csv('all_pdb_entries.csv', index=False)


'''
Step 4: Find the best resolution structure for each UniProt ID
'''
# Convert Resolution to numeric
df['Resolution'] = pd.to_numeric(df['Resolution'], errors='coerce')

# Drop rows with missing UniProt IDs or Resolution
df = df.dropna(subset=['UniProt_ID', 'Resolution'])

# Remove duplicates if any
df = df.drop_duplicates(subset=['PDB_ID', 'UniProt_ID'])

# Sort by UniProt_ID and Resolution
df = df.sort_values(['UniProt_ID', 'Resolution'])

# Group by UniProt_ID and select the entry with the lowest resolution
best_entries = df.groupby('UniProt_ID').first().reset_index()

# Optional: Keep only necessary columns
best_entries = best_entries[['UniProt_ID', 'PDB_ID', 'Resolution']]

## Display the first few entries
print(best_entries.head())

# Save to a CSV file
best_entries.to_csv('best_pdb_entries_by_uniprot.csv', index=False)