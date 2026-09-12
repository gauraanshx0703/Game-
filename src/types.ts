/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CalculatorMode = 'standard' | 'scientific' | 'programmer' | 'converter';

export interface HistoryItem {
  id: string;
  equation: string;
  result: string;
  timestamp: string;
  mode: CalculatorMode;
}

export type ProgrammerBase = 'BIN' | 'OCT' | 'DEC' | 'HEX';

export type ProgrammerWordSize = 8 | 16 | 32 | 64;

export type ConverterCategory = 'length' | 'mass' | 'temperature' | 'area' | 'volume' | 'speed' | 'currency';

export interface ConversionUnit {
  id: string;
  name: string;
  symbol: string;
  factor: number; // Factor relative to a base unit (e.g. meter, gram, etc.)
}

export interface ConverterState {
  category: ConverterCategory;
  fromUnitId: string;
  toUnitId: string;
  fromValue: string;
  toValue: string;
}
