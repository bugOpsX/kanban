import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  arrayUnion,
  arrayRemove,
  doc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';

export const CollaborationService = {
  // Invite a user to collaborate
  inviteCollaborator: async (categoryId, email) => {
    try {
      // Check if user exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('User not found');
      }

      const invitedUser = querySnapshot.docs[0];

      // Add collaboration invitation
      await addDoc(collection(db, 'collaborations'), {
        categoryId,
        invitedUserId: invitedUser.id,
        invitedEmail: email,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Update category with pending invitation
      const categoryRef = doc(db, 'categories', categoryId);
      await updateDoc(categoryRef, {
        pendingInvites: arrayUnion(email)
      });

      return true;
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      throw error;
    }
  },

  // Share category with specific users
  shareCategory: async (categoryId, userIds) => {
    try {
      const categoryRef = doc(db, 'categories', categoryId);
      await updateDoc(categoryRef, {
        shared: true,
        collaborators: arrayUnion(...userIds),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error sharing category:', error);
      throw error;
    }
  },

  // Accept collaboration invitation
  acceptInvitation: async (invitationId) => {
    try {
      const invitationRef = doc(db, 'collaborations', invitationId);
      const invitation = await getDoc(invitationRef);
      
      if (!invitation.exists()) {
        throw new Error('Invitation not found');
      }

      const invitationData = invitation.data();
      const categoryRef = doc(db, 'categories', invitationData.categoryId);

      // Update invitation status
      await updateDoc(invitationRef, {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });

      // Update category collaborators
      await updateDoc(categoryRef, {
        collaborators: arrayUnion(invitationData.invitedUserId),
        pendingInvites: arrayRemove(invitationData.invitedEmail)
      });

      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  },

  // Decline collaboration invitation
  declineInvitation: async (invitationId) => {
    try {
      const invitationRef = doc(db, 'collaborations', invitationId);
      const invitation = await getDoc(invitationRef);
      
      if (!invitation.exists()) {
        throw new Error('Invitation not found');
      }

      const invitationData = invitation.data();
      const categoryRef = doc(db, 'categories', invitationData.categoryId);

      // Update invitation status
      await updateDoc(invitationRef, {
        status: 'declined',
        updatedAt: serverTimestamp()
      });

      // Remove from pending invites
      await updateDoc(categoryRef, {
        pendingInvites: arrayRemove(invitationData.invitedEmail)
      });

      return true;
    } catch (error) {
      console.error('Error declining invitation:', error);
      throw error;
    }
  },

  // Remove collaborator from category
  removeCollaborator: async (categoryId, userId) => {
    try {
      const categoryRef = doc(db, 'categories', categoryId);
      await updateDoc(categoryRef, {
        collaborators: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
  },

  // Get all collaborations for a user
  getUserCollaborations: async (userId) => {
    try {
      const q = query(
        collection(db, 'collaborations'),
        where('invitedUserId', '==', userId),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user collaborations:', error);
      throw error;
    }
  },

  // Get all collaborators for a category
  getCategoryCollaborators: async (categoryId) => {
    try {
      const categoryRef = doc(db, 'categories', categoryId);
      const category = await getDoc(categoryRef);
      
      if (!category.exists()) {
        throw new Error('Category not found');
      }

      const collaboratorIds = category.data().collaborators || [];
      const collaborators = [];

      for (const id of collaboratorIds) {
        const userRef = doc(db, 'users', id);
        const user = await getDoc(userRef);
        if (user.exists()) {
          collaborators.push({
            id: user.id,
            ...user.data()
          });
        }
      }

      return collaborators;
    } catch (error) {
      console.error('Error getting category collaborators:', error);
      throw error;
    }
  }
};

export default CollaborationService; 