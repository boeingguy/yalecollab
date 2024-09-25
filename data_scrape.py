'''
2024-08-29
Anna Su (anna.su@yale.edu)
This script contains functions to fetch data from UniProt and RCSB PDB.
'''

import requests

with open('pdb.graphql', 'r') as f:
    PDB_GRAPHQL_QUERY = f.read()

# This function downloads PDB files from the RCSB PDB
def download_pdb_files(pdb_ids, shared_folder_path):
    failed_ids = []
    
    for pdb_id in pdb_ids:
        # Define the URL for fetching the experimental PDB file
        pdb_url = f"https://files.rcsb.org/download/{pdb_id}.pdb"

        # Make an HTTP request to the PDB and save the file in the shared folder
        response = requests.get(pdb_url)
        if response.status_code == 200:
            with open(f"{shared_folder_path}/{pdb_id}.pdb", "wb") as pdb_file:
                pdb_file.write(response.content)
            print(f"Downloaded {pdb_id}.pdb")
        else:
            failed_ids.append(pdb_id)
            print(f"Failed to download {pdb_id}.pdb")
    
    return failed_ids

# This function fetches information about a pdb entry from RCSB PDB
def fetch_pdb_data(*pdb_ids: [str]) -> dict:
    # Send a POST request to RCSB GraphQL API
    response = requests.post(
        "https://data.rcsb.org/graphql",
        json={"query": PDB_GRAPHQL_QUERY, "variables": {"entry_ids": pdb_ids}}
    )

    # Handle unsuccessful response
    if response.status_code != 200:
        return {"error": f"Request failed with status code {response.status_code}"}
    
    data: dict = response.json()
    if 'errors' in data:
        return {"error": data['errors'][0]['message']}

    # Extract information from the JSON response    
    data = data.get('data', {}).get('entries', {})
    if not data:
        return {"error": "No data returned from RCSB"}

    def get_entity_info(entity: dict):
        # organisms = entity.get('rcsb_entity_source_organism') or []
        # genes = (organisms[0].get('rcsb_gene_name') or []) if organisms else []
        return {
            # "molecule": entity['rcsb_polymer_entity']['pdbx_description'],
            # "chains": entity['rcsb_polymer_entity_container_identifiers']['asym_ids'],
            # "auth_chains": entity['rcsb_polymer_entity_container_identifiers']['auth_asym_ids'],
            "uniprot_ids": entity['rcsb_polymer_entity_container_identifiers']['uniprot_ids']
        }
    
    return {
        pdb_id: {
            "resolution": entry.get('rcsb_entry_info', {}).get('resolution_combined', [None])[0],
            # "rcsb_accession_info": entry.get('rcsb_accession_info', {}).get('deposit_date'),
            # "entities": [get_entity_info(entity) for entity in entry.get('polymer_entities', [])],
            "uniprot_ids": list(set([
                uniprot_id
                for entity in entry.get('polymer_entities') or []
                for uniprot_id in entity['rcsb_polymer_entity_container_identifiers']['uniprot_ids'] or []
                ]))
    } for pdb_id, entry in zip(pdb_ids, data)}


# This function fetches the UniProt ID of a protein from a PDB entry
def get_uniprot_from_pdb(pdb_code, chain):
    # Fetch data from PDB API
    data = fetch_pdb_data(pdb_code)
    
    # Handle errors
    if 'error' in data:
        return []
    
    # Extract information from the data
    for entity in data[pdb_code]['entities']:
        if chain in entity['chains'] or chain in entity['auth_chains']:
            return entity['uniprot_ids']
    return []

# This function fetches the molecular functions of a protein from UniProt
def fetch_uniprot_mf(uniprot_id: str) -> dict:
    # Send a GET request to UniProt
    response = requests.get(f"https://rest.uniprot.org/uniprot/{uniprot_id}.json")

    # Check the response status
    if response.status_code != 200:
        return {"error": f"{response.status_code} - Unable to retrieve UniProt data"}

    # Extract information from the JSON response
    data: dict = response.json()
    output =  {
        'id': uniprot_id,
        'molecular_functions': [keyword.get("name") for keyword in data.get("keywords", []) if keyword.get("category") == "Molecular function"],
    }
    return output