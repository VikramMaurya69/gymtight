import { db } from './firebase';
import {
    collection,
    addDoc,
    query,
    orderBy,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    Timestamp
} from './sqlFirestoreCompat';

export class MessagesService {
    constructor() {
        this.collectionName = 'messages';
    }

    // Get all messages
    async getMessages() {
        try {
            const q = query(
                collection(db, this.collectionName),
                orderBy('startAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const messages = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                messages.push({
                    id: doc.id,
                    ...data,
                    startAt: data.startAt?.toDate ? data.startAt.toDate() : data.startAt,
                    endAt: data.endAt?.toDate ? data.endAt.toDate() : data.endAt,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
                });
            });

            return { success: true, data: messages };
        } catch (error) {
            console.error('Error fetching messages:', error);
            return { success: false, error: error.message };
        }
    }

    // Add new message
    async addMessage(messageData) {
        try {
            const newMessage = {
                text: messageData.text || '',
                startAt: messageData.startAt ? Timestamp.fromDate(new Date(messageData.startAt)) : Timestamp.now(),
                endAt: messageData.endAt ? Timestamp.fromDate(new Date(messageData.endAt)) : Timestamp.now(),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(collection(db, this.collectionName), newMessage);

            return {
                success: true,
                data: { id: docRef.id, ...newMessage },
                message: 'Message added successfully'
            };
        } catch (error) {
            console.error('Error adding message:', error);
            return { success: false, error: error.message };
        }
    }

    // Update message
    async updateMessage(messageId, messageData) {
        try {
            const messageRef = doc(db, this.collectionName, messageId);

            const updateData = {
                text: messageData.text,
                updatedAt: Timestamp.now()
            };

            if (messageData.startAt) {
                updateData.startAt = Timestamp.fromDate(new Date(messageData.startAt));
            }
            if (messageData.endAt) {
                updateData.endAt = Timestamp.fromDate(new Date(messageData.endAt));
            }

            // Remove undefined fields
            Object.keys(updateData).forEach(key =>
                updateData[key] === undefined && delete updateData[key]
            );

            await updateDoc(messageRef, updateData);

            return {
                success: true,
                message: 'Message updated successfully'
            };
        } catch (error) {
            console.error('Error updating message:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete message
    async deleteMessage(messageId) {
        try {
            await deleteDoc(doc(db, this.collectionName, messageId));
            return {
                success: true,
                message: 'Message deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting message:', error);
            return { success: false, error: error.message };
        }
    }
}

export const messagesService = new MessagesService();


