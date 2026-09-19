import { useState, useEffect, useMemo } from 'react';
import { Country, State, City, ICountry, IState, ICity } from 'country-state-city';

interface UseGlobalAddressDataReturn {
  countries: ICountry[];
  states: IState[];
  cities: ICity[];
  loading: boolean;
  error: string | null;
  
  // Helper functions
  getStatesByCountry: (countryCode: string) => IState[];
  getCitiesByState: (countryCode: string, stateCode: string) => ICity[];
  
  // Find functions
  findCountryByName: (name: string) => ICountry | undefined;
  findStateByName: (countryCode: string, name: string) => IState | undefined;
  findCityByName: (countryCode: string, stateCode: string, name: string) => ICity | undefined;
}

/**
 * Hook for global address data (Country → State/Province → City)
 * Uses country-state-city package for worldwide address data
 */
export const useGlobalAddressData = (): UseGlobalAddressDataReturn => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    try {
      setLoading(true);
      // Data is loaded synchronously from the package
      // Just verify it's available
      const testCountries = Country.getAllCountries();
      if (!testCountries || testCountries.length === 0) {
        throw new Error('Không thể tải dữ liệu quốc gia');
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu địa chỉ');
      console.error('Error loading address data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get all countries
  const countries = useMemo(() => {
    try {
      return Country.getAllCountries();
    } catch (err) {
      console.error('Error getting countries:', err);
      return [];
    }
  }, []);

  // Get states by country
  const getStatesByCountry = (countryCode: string): IState[] => {
    try {
      if (!countryCode) return [];
      return State.getStatesOfCountry(countryCode);
    } catch (err) {
      console.error('Error getting states:', err);
      return [];
    }
  };

  // Get cities by state
  const getCitiesByState = (countryCode: string, stateCode: string): ICity[] => {
    try {
      if (!countryCode || !stateCode) return [];
      return City.getCitiesOfState(countryCode, stateCode);
    } catch (err) {
      console.error('Error getting cities:', err);
      return [];
    }
  };

  // Find country by name
  const findCountryByName = (name: string): ICountry | undefined => {
    if (!name) return undefined;
    return countries.find(c => 
      c.name.toLowerCase() === name.toLowerCase() ||
      c.isoCode.toLowerCase() === name.toLowerCase()
    );
  };

  // Find state by name
  const findStateByName = (countryCode: string, name: string): IState | undefined => {
    if (!countryCode || !name) return undefined;
    const states = getStatesByCountry(countryCode);
    return states.find(s => 
      s.name.toLowerCase() === name.toLowerCase() ||
      s.isoCode.toLowerCase() === name.toLowerCase()
    );
  };

  // Find city by name
  const findCityByName = (countryCode: string, stateCode: string, name: string): ICity | undefined => {
    if (!countryCode || !stateCode || !name) return undefined;
    const cities = getCitiesByState(countryCode, stateCode);
    return cities.find(c => c.name.toLowerCase() === name.toLowerCase());
  };

  // Memoize states and cities (empty by default, populated by helper functions)
  const states = useMemo(() => [] as IState[], []);
  const cities = useMemo(() => [] as ICity[], []);

  return {
    countries,
    states,
    cities,
    loading,
    error,
    getStatesByCountry,
    getCitiesByState,
    findCountryByName,
    findStateByName,
    findCityByName,
  };
};

export default useGlobalAddressData;
