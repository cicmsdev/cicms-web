// src/services/claims.api.ts
import api from "@/lib/axios";
import {
  ApiMessage,
  Claim,
  CreateClaimPayload,
  DashboardResponse,
  Paginated,
  QueryClaimsParams,
  UpdateClaimPayload,
} from "@/lib/claims";
import axios, { AxiosError } from "axios";



// Improved error handling function
function handleError(error: any): never {
  console.error('API Error details:', error);
  
  // Check if it's an Axios error with response data
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    if (axiosError.response) {
      const { data, status } = axiosError.response;
      
      // Try to extract message from common backend error formats
      let message = 'An unexpected error occurred';
      
      if (typeof data === 'object' && data !== null) {
        // NestJS format: { message: string }
        if ('message' in data) {
          message = (data as any).message;
        }
        // Another common format: { error: string }
        else if ('error' in data) {
          message = (data as any).error;
        }
      }
      
      // Handle different HTTP status codes
      switch (status) {
        case 400:
          throw new Error(message || 'Bad request. Please check your input.');
        case 401:
          throw new Error('Authentication failed. Please login again.');
        case 403:
          throw new Error(message || 'You do not have permission to perform this action.');
        case 404:
          throw new Error(message || 'The requested resource was not found.');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error(message || `Unexpected error (${status}).`);
      }
    }
  }
  
  // Check for network errors
  if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
    throw new Error('Network error. Please check your connection.');
  }
  
  // Check for timeout errors
  if (error.code === 'ECONNABORTED') {
    throw new Error('Request timeout. Please try again.');
  }
  
  // Fallback to generic error message
  throw new Error(error.message || 'An unexpected error occurred.');
}


export const createClaim = async (
  payload: CreateClaimPayload
): Promise<ApiMessage<Claim>> => {
  try {
    const res = await api.post("/contractor/claims", payload);
    return res.data;
  } catch (error: any) {
    // More detailed error logging
    console.error('Create claim error:', error);
    
    // Check if it's a validation error with detailed messages
    if (error.response?.data?.errors) {
      const validationErrors = error.response.data.errors;
      const errorMessage = Object.values(validationErrors).flat().join(', ');
      throw new Error(errorMessage);
    }
    
    throw handleError(error);
  }
};

export const updateMyClaim = async (
  claimId: string,
  payload: UpdateClaimPayload
): Promise<ApiMessage<Claim>> => {
  try {
    console.log('Sending update request for claim:', claimId, 'with payload:', payload);
    const res = await api.patch(`/contractor/claims/${claimId}`, payload);
    console.log('Update response:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('Update claim error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    });
    
    if (error.response?.data?.errors) {
      const validationErrors = error.response.data.errors;
      const errorMessage = Object.values(validationErrors).flat().join(', ');
      throw new Error(errorMessage);
    }
    
    throw handleError(error);
  }
};

export const getMyClaim = async (claimId: string): Promise<Claim> => {
  try {
    const res = await api.get(`/contractor/claims/${claimId}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const listMyClaims = async (
  params: QueryClaimsParams = {}
): Promise<Paginated<Claim>> => {
  try {
    const res = await api.get("/contractor/claims", { params });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const getMyDashboard = async (): Promise<DashboardResponse> => {
  try {
    const res = await api.get("/contractor/claims/metrics/summary");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
