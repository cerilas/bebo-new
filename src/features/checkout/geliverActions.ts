'use server';

type GeliverResponse<T> = {
  result: boolean;
  additionalMessage: string;
  data: T;
};

export type City = {
  name: string;
  areaCode: string;
  cityCode: string;
  countryCode: string;
};

export type District = {
  name: string;
  districtID: number;
  cityCode: string;
  regionCode: string | null;
  countryCode: string;
};

/**
 * Fetch list of cities from Geliver API
 */
export async function getCities(): Promise<{ success: boolean; data?: City[]; error?: string }> {
  try {
    const response = await fetch('https://api.geliver.io/api/v1/cities?countryCode=TR', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Geliver API error: ${response.statusText}`);
    }

    const result = (await response.json()) as GeliverResponse<City[]>;

    if (result.result && Array.isArray(result.data)) {
      return { success: true, data: result.data };
    }

    return { success: false, error: result.additionalMessage || 'Failed to fetch cities' };
  } catch (error) {
    console.error('Error fetching cities:', error);
    return { success: false, error: 'Cities could not be loaded' };
  }
}

/**
 * Fetch list of districts for a specific city from Geliver API
 */
export async function getDistricts(
  cityCode: string,
): Promise<{ success: boolean; data?: District[]; error?: string }> {
  try {
    if (!cityCode) {
      return { success: false, error: 'City code is required' };
    }

    const response = await fetch(
      `https://api.geliver.io/api/v1/districts?countryCode=TR&cityCode=${cityCode}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      },
    );

    if (!response.ok) {
      throw new Error(`Geliver API error: ${response.statusText}`);
    }

    const result = (await response.json()) as GeliverResponse<District[]>;

    if (result.result && Array.isArray(result.data)) {
      return { success: true, data: result.data };
    }

    return { success: false, error: result.additionalMessage || 'Failed to fetch districts' };
  } catch (error) {
    console.error('Error fetching districts:', error);
    return { success: false, error: 'Districts could not be loaded' };
  }
}
