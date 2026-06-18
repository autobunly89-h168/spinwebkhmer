/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Participant {
  id: string;
  name: string;
  avatar?: string; // local image base64 or placeholder
}

export interface Prize {
  id: string;
  place: 1 | 2 | 3;
  type: '1st' | '2nd' | '3rd';
  title: string;
  image?: string; // base64 uploaded image of the prize
}

export interface Winner {
  id: string; // matches winner ID or generated unique ID
  name: string;
  place: 1 | 2 | 3; // 1 = First, 2 = Second, 3 = Third
  prizeTitle: string;
  avatar?: string; // base64 image representing the winner
  drawnAt: string;
}

export interface AppSettings {
  logo?: string; // base64 string for the uploaded logo
  congratulationsText: string; // Khmer text at the bottom of the poster
  spinDuration: number; // in seconds
  themeColor: string; // Accent color hex
  removeWinnersAfterSpin: boolean;
}
