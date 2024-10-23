//This piece of code, will fetch UniProt IDs that correspond to Homo sapiens.
//In the master file of PDB ID's, there are several entries in the UniProt ID column
//and not all correspond to Homo sapiens. 
//I am also using the PapaParse Library to sift through large CSV files, it seems to 
//work quite well here. 

const Papa = require('papaparse'); // PapaParse library
const fs = require('fs');          // File system to read CSV
const fetch = require('node-fetch'); // To make API calls
const path = require('path');

// Step 1: Read the CSV file using fs
const file = fs.readFileSync('output_copy.csv', 'utf8');

// Arrays to store success and failure entries
let successEntries = [];
let failureEntries = [];

// Function to write the CSV files for success and failure entries
function writeCsv(data, fileName) {
    const csv = Papa.unparse(data);
    fs.writeFileSync(path.join(__dirname, fileName), csv);
}

// Step 2: Parse the CSV data using PapaParse
Papa.parse(file, {
    header: true,   // Parse as key-value pair objects
    complete: async function(results) {
        // Store the parsed data
        let data = results.data;
        console.log(`Parsed ${data.length} rows from the input CSV.`);

        // Process each row to filter UniProt IDs
        for (const row of data) {
            if (row['UniProt IDs']) { // Check if 'UniProt IDs' is defined
                console.log(`Processing row with PDB ID: ${row['PDB ID']}`);

                let uniprotIds = row['UniProt IDs'].split(';');
                let filteredIds = [];

                // Step 3: For each UniProt ID, check organism info
                for (let id of uniprotIds) {
                    let isHuman = await checkIfHuman(id);
                    if (isHuman) {
                        filteredIds.push(id);
                    }
                }

                // Step 4: Update the row with filtered IDs
                if (filteredIds.length > 0) {
                    row['UniProt IDs'] = filteredIds.join(';');
                    successEntries.push(row);
                    console.log(`Success: UniProt IDs for PDB ID ${row['PDB ID']} updated.`);
                } else {
                    failureEntries.push({ ...row, Error: 'No Homo sapiens UniProt IDs found.' });
                    console.log(`Failure: No Homo sapiens UniProt IDs for PDB ID ${row['PDB ID']}.`);
                }
            } else {
                failureEntries.push({ ...row, Error: 'Missing UniProt IDs.' });
                console.log(`Failure: Missing UniProt IDs for PDB ID ${row['PDB ID']}.`);
            }
        }

        // Step 5: Write success and failure data to CSV files
        writeCsv(successEntries, 'successful_uniprot_entries.csv');
        writeCsv(failureEntries, 'failed_uniprot_entries.csv');
        console.log(`Success and failure logs written to CSV files.`);

        // Step 6: Present a random selection of 50 IDs from success entries
        const sampleSize = 50;
        if (successEntries.length > 0) {
            const randomSample = successEntries
                .sort(() => 0.5 - Math.random())
                .slice(0, sampleSize);
            console.log(`Random sample of ${sampleSize} UniProt IDs from successful entries:`);
            randomSample.forEach((row, idx) => {
                console.log(`${idx + 1}. PDB ID: ${row['PDB ID']}, UniProt IDs: ${row['UniProt IDs']}`);
            });
        } else {
            console.log(`No successful entries to display.`);
        }
    }
});

// Step 7: Function to check if UniProt ID is from Homo sapiens
async function checkIfHuman(uniprotId) {
    try {
        const response = await fetch(`https://www.uniprot.org/uniprot/${uniprotId}.json`);
        const data = await response.json();

        // Check if the organism is Homo sapiens
        if (data.organism && data.organism.scientificName === "Homo sapiens") {
            return true;
        }
    } catch (error) {
        console.error(`Error fetching data for UniProt ID ${uniprotId}:`, error);
        failureEntries.push({ 'UniProt ID': uniprotId, Error: `API error: ${error.message}` });
    }
    return false;
}
