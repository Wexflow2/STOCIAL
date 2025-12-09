import axios from 'axios';
import { API_ENDPOINTS } from '@/config/api';

const API_BASE_URL = API_ENDPOINTS.api;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getUser = (userId: number) => {
  return apiClient.get(`/users/${userId}`);
};

export const updateUser = (userId: number, userData: Record<string, unknown>) => {
  return apiClient.post(`/users/${userId}`, userData);
};

export const getUserPosts = (userId: number) => {
  return apiClient.get(`/posts/${userId}`);
};

export const createPost = (postData: Record<string, unknown>) => {
  return apiClient.post('/posts', postData);
};

export const toggleLike = (postId: number, userId: number) => {
  return apiClient.post('/likes', { post_id: postId, user_id: userId });
};

export const getFeed = () => {
  return apiClient.get('/feed');
};

export const getSocialLinks = (userId: number) => {
  return apiClient.get(`/social-links/${userId}`);
};

export const createSocialLink = (userId: number, platform: string, url: string) => {
  return apiClient.post('/social-links', { user_id: userId, platform, url });
};

export const deleteSocialLink = (id: number, userId?: number) => {
  return apiClient.delete(`/social-links/${id}`, {
    data: userId ? { userId } : undefined,
  });
};

export const createMention = (postId: number, userId: number, mentionedUserId: number) => {
  return apiClient.post('/mentions', { post_id: postId, user_id: userId, mentioned_user_id: mentionedUserId });
};

export const toggleFollow = (followerId: number, followingId: number) => {
  return apiClient.post('/follow', { follower_id: followerId, following_id: followingId });
};

export const sendMessage = (senderId: number, recipientId: number, content: string) => {
  return apiClient.post('/messages', { sender_id: senderId, recipient_id: recipientId, content });
};

export const getMessages = (userId: number, otherUserId: number) => {
  return apiClient.get(`/messages/${userId}/${otherUserId}`);
};

export const addHashtagToPost = (postId: number, tag: string) => {
  return apiClient.post('/post-hashtag', { post_id: postId, tag });
};
