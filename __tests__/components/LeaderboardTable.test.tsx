// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeaderboardTable, { type LeaderboardEntry } from '@/app/components/LeaderboardTable';

function makeEntry(overrides: Partial<LeaderboardEntry> & { discogs_username: string }): LeaderboardEntry {
  return {
    avg_rarity_score: 0.5,
    rarest_item_score: 0.6,
    rarest_item_title: 'Test Album',
    rarest_item_artist: 'Test Artist',
    collection_size: 100,
    analyzed_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('LeaderboardTable', () => {
  it('empty entries → renders empty state message', () => {
    render(<LeaderboardTable entries={[]} rank="avg_rarity" />);
    expect(screen.getByText(/no entries/i)).toBeInTheDocument();
  });

  it('renders a row for each entry', () => {
    const entries = [
      makeEntry({ discogs_username: 'alice' }),
      makeEntry({ discogs_username: 'bob' }),
      makeEntry({ discogs_username: 'charlie' }),
    ];
    render(<LeaderboardTable entries={entries} rank="avg_rarity" />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();
  });

  it('rank 1/2/3 rows show medal emojis', () => {
    const entries = [
      makeEntry({ discogs_username: 'first' }),
      makeEntry({ discogs_username: 'second' }),
      makeEntry({ discogs_username: 'third' }),
      makeEntry({ discogs_username: 'fourth' }),
    ];
    render(<LeaderboardTable entries={entries} rank="avg_rarity" />);
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
    // 4th place is just a number
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('username links to https://www.discogs.com/user/{username}', () => {
    const entries = [makeEntry({ discogs_username: 'vinylking' })];
    render(<LeaderboardTable entries={entries} rank="avg_rarity" />);
    const link = screen.getByRole('link', { name: 'vinylking' });
    expect(link).toHaveAttribute('href', 'https://www.discogs.com/user/vinylking');
  });

  it('username with special chars is URL-encoded in href', () => {
    const entries = [makeEntry({ discogs_username: 'user name' })];
    render(<LeaderboardTable entries={entries} rank="avg_rarity" />);
    const link = screen.getByRole('link', { name: 'user name' });
    expect(link).toHaveAttribute('href', 'https://www.discogs.com/user/user%20name');
  });

  it('avg_rarity rank → shows avg_rarity_score in score column', () => {
    const entries = [makeEntry({ discogs_username: 'u1', avg_rarity_score: 0.8765 })];
    render(<LeaderboardTable entries={entries} rank="avg_rarity" />);
    expect(screen.getByText('0.8765')).toBeInTheDocument();
  });

  it('collection rank → shows collection_size in score column', () => {
    const entries = [makeEntry({ discogs_username: 'u1', collection_size: 1234 })];
    render(<LeaderboardTable entries={entries} rank="collection" />);
    // toLocaleString may format as "1,234" - just check it's somewhere in the doc
    const cellText = screen.getByText(/1.?234/);
    expect(cellText).toBeInTheDocument();
  });

  it('rarest_item rank → shows rarest_item_score', () => {
    const entries = [makeEntry({ discogs_username: 'u1', rarest_item_score: 0.9123 })];
    render(<LeaderboardTable entries={entries} rank="rarest_item" />);
    expect(screen.getByText('0.9123')).toBeInTheDocument();
  });

  it('score header changes based on rank prop', () => {
    const entries = [makeEntry({ discogs_username: 'u1' })];
    const { rerender } = render(<LeaderboardTable entries={entries} rank="avg_rarity" />);
    expect(screen.getByText('Avg Rarity Score')).toBeInTheDocument();

    rerender(<LeaderboardTable entries={entries} rank="rarest_item" />);
    expect(screen.getByText('Rarest Item Score')).toBeInTheDocument();

    rerender(<LeaderboardTable entries={entries} rank="collection" />);
    expect(screen.getByText('Collection Size')).toBeInTheDocument();
  });
});
