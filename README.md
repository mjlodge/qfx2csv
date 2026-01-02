# QFX/OFX to CSV/XLSX

## Convert Quicken brokerage files to spreadsheets

This is a very simple browser-based application that extracts brokerage transactions from a Quicken file and turns them into something you can use in Excel or other spreadsheet software.
I developed it because I needed it for preparing my UK taxes as someone who has US brokerage accounts. Fun times!

It was developed using Lovable and operates entirely within the browser -- no data is sent to a 3rd party server.

## Use

It's [running on Lovable here](https://qfx2csv.lovable.app)

Instructions for running locally:

You must have a functioning Node.js installation on your computer, including npm

1. Clone the repo
2. cd into the directory
3. npm i
4. npm run dev


```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

# License

This app is licensed under the Mozilla Public License (MPL) 2.0. The main points are that it's open source and anyone can use it, but you have to publish any modifications you make.

# Contributions

Feel free to submit a PR if you want to make a change.
