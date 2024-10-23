// This piece of code will only keep those entries who have a count of greater
// than 0 in the "Mutation" column. 

const Papa = require('papaparse'); // PapaParse library
const fs = require('fs');          // File system to read CSV
const path = require('path');

// Step 1: Read the correct CSV file using fs (Make sure the file path is correct)
const file = fs.readFileSync('lowest_resolution_per_uniprot.csv', 'utf8');

// Array to store the filtered rows
let filteredRows = [];

// Step 2: Parse the CSV data using PapaParse
Papa.parse(file, {
    header: true,   // Parse as key-value pair objects
    complete: function(results) {
        // Store the parsed data
        let data = results.data;
        console.log(`Parsed ${data.length} rows from the input CSV.`);

        // Step 3: Filter rows where Mutation Count > 0
        filteredRows = data.filter(row => {
            let mutationCount = parseInt(row['Mutation Count'], 10); // Parse Mutation Count as integer
            return mutationCount > 0; // Keep rows where Mutation Count is greater than 0
        });

        console.log(`Filtered ${filteredRows.length} rows with Mutation Count greater than 0.`);

        // Step 4: Write filtered rows to a new CSV file
        writeCsv(filteredRows, 'filtered_by_mutation_count.csv');
        console.log(`Filtered rows have been written to 'filtered_by_mutation_count.csv'.`);

        // Step 5: Display a random selection of 50 rows
        const sampleSize = 50;
        const randomSample = filteredRows.sort(() => 0.5 - Math.random()).slice(0, sampleSize);
        console.log(`Random sample of ${sampleSize} filtered rows:`);
        randomSample.forEach((row, idx) => {
            console.log(`${idx + 1}. PDB ID: ${row['PDB ID']}, Resolution: ${row['Resolution']}, UniProt IDs: ${row['UniProt IDs']}, Mutation Count: ${row['Mutation Count']}`);
        });
    }
});

// Function to write the CSV file
function writeCsv(data, fileName) {
    const csv = Papa.unparse(data);
    fs.writeFileSync(path.join(__dirname, fileName), csv);
}
