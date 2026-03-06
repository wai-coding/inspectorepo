import axios from 'axios';
import { Logger } from './logger';
import { formatDate, formatCurrency, formatPercentage } from './formatters';
import * as config from './config';

// Logger and formatPercentage are unused — triggers unused-imports rule
// config namespace is unused — triggers unused-imports rule

interface ApiResponse<T> {
  data: T;
  status: number;
  timestamp: string;
}

export async function fetchUserProfile(userId: string): Promise<ApiResponse<unknown>> {
  const url = `https://api.example.com/users/${encodeURIComponent(userId)}`;
  const response = await axios.get(url);
  const formatted = formatDate(response.data.createdAt);
  const price = formatCurrency(response.data.balance);
  return { data: { ...response.data, formatted, price }, status: response.status, timestamp: new Date().toISOString() };
}
