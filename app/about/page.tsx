import React from 'react';
import Header from '../components/Header';

const AboutPage = () => {
  return (
    <div className="py-8">
      <Header />
      <div className="max-w-4xl mx-auto">
        <div className="card mb-8">
          
        

          <div className="space-y-6">
            <section>
              <h2>What is Raerz?</h2>
              <p>
                Raerz is a tool that helps vinyl collectors analyze their Discogs collections to discover how rare their records are. 
                It leverages Discogs' extensive data to provide insights into record rarity and collection value.
              </p>
            </section>

            <section>
              <h2>How It Works</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Connect Your Account:</strong> Log in with your Discogs account to access your collection data.
                </li>
                <li>
                  <strong>Collection Analysis:</strong> We analyze your collection to identify your rarest and most sought-after items.
                </li>
                <li>
                  <strong>Rarity Scoring:</strong> Each record receives a rarity score based on several factors from the Discogs database.
                </li>
                <li>
                  <strong>Discover Gems:</strong> Find out which records in your collection are the most valuable and rare.
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
                raerz is not affiliated with or endorsed by Discogs. All product names, logos, and brands are property of their respective owners.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage; 