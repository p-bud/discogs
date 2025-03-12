import React from 'react';
import Header from '../components/Header';

const AboutPage = () => {
  return (
    <div className="py-8">
      <Header />
      <div className="max-w-4xl mx-auto">
        <div className="card mb-8">
          <h1>About Discogs Explorer</h1>
          <p className="text-gray-600 mb-6">
            Explore and analyze vinyl records on Discogs
          </p>

          <div className="space-y-6">
            <section>
              <h2>What is Discogs Explorer?</h2>
              <p>
                Discogs Explorer is a tool that helps vinyl collectors explore the Discogs database, analyze their collections, and discover rare records. It leverages Discogs' extensive data to provide insights into record rarity and collection value.
              </p>
            </section>

            <section>
              <h2>How It Works</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Search & Filter:</strong> Use our detailed filters to find specific releases by genre, artist, style, format, and more.
                </li>
                <li>
                  <strong>Rarity Analysis:</strong> Our algorithm calculates rarity scores based on Discogs' want/have ratios to help you discover valuable records.
                </li>
                <li>
                  <strong>Collection Analysis:</strong> Connect your Discogs account to analyze your collection and identify your rarest and most sought-after items.
                </li>
                <li>
                  <strong>Save & Discover:</strong> Save your searches and explore similar records to expand your collection.
                </li>
              </ol>
            </section>

            <section>
              <h2>Rarity Score Calculation</h2>
              <p>
                Our system calculates rarity scores using the following factors:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>The want/have ratio from Discogs (more wants compared to haves = higher rarity)</li>
                <li>The total number of copies in collections (fewer copies = higher rarity)</li>
                <li>The age and release information of the record</li>
                <li>Format rarity (certain vinyl formats are inherently more rare)</li>
              </ul>
            </section>

            <section>
              <h2>Data Sources</h2>
              <p>
                All database information is sourced from the Discogs API. Discogs is the largest online music database and marketplace, with millions of users cataloging and discussing vinyl records, CDs, and more.
              </p>
            </section>

            <section className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Discogs Explorer is not affiliated with or endorsed by Discogs. All product names, logos, and brands are property of their respective owners.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage; 