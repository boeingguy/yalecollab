//This piece of code will select unique UniProt ID's and then only keep those 
//which correspond to the lowest resolution. 

const Papa = require('papaparse'); // PapaParse library
const fs = require('fs');          // File system to read CSV
const path = require('path');

// Step 1: Read the CSV file using fs
const file = fs.readFileSync('successful_uniprot_entries.csv', 'utf8');

// Arrays to store the final selected rows
let selectedRows = [];

// Step 2: Parse the CSV data using PapaParse
Papa.parse(file, {
    header: true,   // Parse as key-value pair objects
    complete: function(results) {
        // Store the parsed data
        let data = results.data;
        console.log(`Parsed ${data.length} rows from the input CSV.`);

        // Step 3: Group by UniProt ID and find the row with the lowest resolution
        const groupedByUniProt = data.reduce((acc, row) => {
            let uniprotId = row['UniProt IDs'];
            let resolution = parseFloat(row['Resolution'].replace(/[^\d.-]/g, '')); // Remove non-numeric characters from resolution

            if (uniprotId) {
                if (!acc[uniprotId]) {
                    acc[uniprotId] = row; // Initialize with the first entry
                } else {
                    // Compare and keep the row with the lowest resolution
                    let currentLowest = parseFloat(acc[uniprotId]['Resolution'].replace(/[^\d.-]/g, ''));
                    if (resolution < currentLowest) {
                        acc[uniprotId] = row; // Replace with new row if it has lower resolution
                    }
                }
            }
            return acc;
        }, {});

        // Collect the rows with the lowest resolution per UniProt ID
        selectedRows = Object.values(groupedByUniProt);

        // Step 4: Write selected rows to a new CSV file
        writeCsv(selectedRows, 'lowest_resolution_per_uniprot.csv');
        console.log(`Selected rows with the lowest resolution for each UniProt ID have been written to CSV file.`);

        // Display a sample of the selected rows
        const sampleSize = 50;
        const randomSample = selectedRows.sort(() => 0.5 - Math.random()).slice(0, sampleSize);
        console.log(`Random sample of ${sampleSize} selected rows:`);
        randomSample.forEach((row, idx) => {
            console.log(`${idx + 1}. PDB ID: ${row['PDB ID']}, Resolution: ${row['Resolution']}, UniProt IDs: ${row['UniProt IDs']}`);
        });
    }
});

// Function to write the CSV file
function writeCsv(data, fileName) {
    const csv = Papa.unparse(data);
    fs.writeFileSync(path.join(__dirname, fileName), csv);
}
