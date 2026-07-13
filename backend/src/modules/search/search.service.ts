/**
 * Search Service - Handles global search functionality
 */

import { DocumentModel } from "../documents/document.model.js";
import { ApiError } from "../../utils/ApiError.js";

interface SearchOptions {
  query: string;
  userId?: string;
  filters?: {
    category?: string;
    status?: string;
    verificationStatus?: string;
    isArchived?: boolean;
    isFavorite?: boolean;
    tags?: string[];
  };
  includeShared?: boolean;
  page?: number;
  limit?: number;
}

interface SearchResult {
  documents: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Global search with full text search
 */
export const globalSearch = async (options: SearchOptions): Promise<SearchResult> => {
  const { query, userId, filters, includeShared, page = 1, limit = 20 } = options;

  if (!query || query.trim().length < 2) {
    return {
      documents: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  const skip = (page - 1) * limit;
  const searchQuery = query.trim();

  // Build base query
  const baseQuery: any = {
    $text: { $search: searchQuery },
  };

  // Add filters
  if (filters) {
    if (filters.category) baseQuery.category = filters.category;
    if (filters.status) baseQuery.status = filters.status;
    if (filters.verificationStatus) baseQuery.verificationStatus = filters.verificationStatus;
    if (filters.isArchived !== undefined) baseQuery.isArchived = filters.isArchived;
    if (filters.isFavorite !== undefined) baseQuery.isFavorite = filters.isFavorite;
    if (filters.tags && filters.tags.length > 0) baseQuery.tags = { $in: filters.tags };
  }

  // If userId provided, only search user's documents (and shared if requested)
  if (userId) {
    const ownerQuery = { ...baseQuery, owner: userId };
    
    if (includeShared) {
      // Search both owned and shared documents
      const [ownedResults, sharedResults] = await Promise.all([
        DocumentModel.find(ownerQuery)
          .select("-storageKey -hash -checksum")
          .skip(skip)
          .limit(limit)
          .sort({ score: { $meta: "textScore" }, createdAt: -1 })
          .lean(),
        DocumentModel.find({
          ...baseQuery,
          owner: { $ne: userId },
        })
          .select("-storageKey -hash -checksum")
          .skip(skip)
          .limit(limit)
          .sort({ score: { $meta: "textScore" }, createdAt: -1 })
          .lean(),
      ]);

      const combinedResults = [...ownedResults, ...sharedResults];
      const total = await DocumentModel.countDocuments(ownerQuery) + 
                    await DocumentModel.countDocuments({ ...baseQuery, owner: { $ne: userId } });

      return {
        documents: combinedResults.slice(0, limit),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } else {
      // Only search owned documents
      const [documents, total] = await Promise.all([
        DocumentModel.find(ownerQuery)
          .select("-storageKey -hash -checksum")
          .skip(skip)
          .limit(limit)
          .sort({ score: { $meta: "textScore" }, createdAt: -1 })
          .lean(),
        DocumentModel.countDocuments(ownerQuery),
      ]);

      return {
        documents,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  }

  // Global search without user filter
  const [documents, total] = await Promise.all([
    DocumentModel.find(baseQuery)
      .select("-storageKey -hash -checksum")
      .skip(skip)
      .limit(limit)
      .sort({ score: { $meta: "textScore" }, createdAt: -1 })
      .lean(),
    DocumentModel.countDocuments(baseQuery),
  ]);

  return {
    documents,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Search by specific field
 */
export const searchByField = async (field: string, value: string, userId?: string): Promise<any[]> => {
  const query: any = { [field]: { $regex: value, $options: "i" } };
  
  if (userId) {
    query.owner = userId;
  }

  const documents = await DocumentModel.find(query)
    .select("-storageKey -hash -checksum")
    .limit(50)
    .lean();

  return documents;
};

/**
 * Get search suggestions
 */
export const getSearchSuggestions = async (query: string, userId?: string): Promise<string[]> => {
  if (!query || query.trim().length < 2) return [];

  const searchQuery = query.trim();
  const baseQuery: any = {
    $text: { $search: searchQuery },
  };

  if (userId) {
    baseQuery.owner = userId;
  }

  const documents = await DocumentModel.find(baseQuery)
    .select("title tags category")
    .limit(10)
    .lean();

  const suggestions = new Set<string>();
  
  documents.forEach((doc) => {
    suggestions.add(doc.title);
    doc.tags?.forEach((tag: string) => suggestions.add(tag));
    suggestions.add(doc.category);
  });

  return Array.from(suggestions).slice(0, 10);
};

/**
 * Get recent searches for a user (stored in user document)
 */
export const getRecentSearches = async (userId: string): Promise<string[]> => {
  // This would be stored in user document in a real implementation
  // For now, return empty array
  return [];
};

/**
 * Save recent search
 */
export const saveRecentSearch = async (userId: string, query: string): Promise<void> => {
  // This would be stored in user document in a real implementation
  // For now, do nothing
};
