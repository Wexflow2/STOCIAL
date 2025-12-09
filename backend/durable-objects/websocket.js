/**
 * WebSocket Durable Object
 * Handles real-time WebSocket connections for chat, notifications, etc.
 */

export class WebSocketServer {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.userSessions = new Map();
  }

  async fetch(request) {
    // Upgrade to WebSocket
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    await this.handleSession(server, request);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleSession(webSocket, request) {
    webSocket.accept();

    const sessionId = crypto.randomUUID();
    let userId = null;

    const session = {
      webSocket,
      sessionId,
      userId: null,
      lastPing: Date.now(),
    };

    this.sessions.set(sessionId, session);

    // Set up message handler
    webSocket.addEventListener('message', async (msg) => {
      try {
        const data = JSON.parse(msg.data);
        
        switch (data.type) {
          case 'auth':
            userId = data.userId;
            session.userId = userId;
            this.userSessions.set(userId, session);
            
            // Broadcast user online status
            this.broadcast({
              type: 'user_status_change',
              userId,
              isOnline: true,
            }, sessionId);
            
            webSocket.send(JSON.stringify({
              type: 'auth_success',
              sessionId,
            }));
            break;

          case 'ping':
            session.lastPing = Date.now();
            webSocket.send(JSON.stringify({ type: 'pong' }));
            break;

          case 'new_post':
            // Broadcast new post to all connected clients
            this.broadcast({
              type: 'new_post',
              post: data.post,
            }, sessionId);
            break;

          case 'new_comment':
            // Broadcast comment to specific post viewers
            this.broadcast({
              type: 'new_comment',
              postId: data.postId,
              comment: data.comment,
            }, sessionId);
            break;

          case 'notification':
            // Send notification to specific user
            const targetSession = this.userSessions.get(data.targetUserId);
            if (targetSession) {
              targetSession.webSocket.send(JSON.stringify({
                type: 'notification',
                notification: data.notification,
              }));
            }
            break;

          case 'like':
            // Broadcast like update
            this.broadcast({
              type: 'update_likes',
              postId: data.postId,
              likesCount: data.likesCount,
            }, sessionId);
            break;

          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error handling message:', error);
        webSocket.send(JSON.stringify({
          type: 'error',
          message: error.message,
        }));
      }
    });

    // Handle disconnect
    webSocket.addEventListener('close', () => {
      this.sessions.delete(sessionId);
      
      if (userId) {
        this.userSessions.delete(userId);
        
        // Broadcast user offline status
        this.broadcast({
          type: 'user_status_change',
          userId,
          isOnline: false,
        });
      }
    });

    // Handle errors
    webSocket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    webSocket.send(JSON.stringify({
      type: 'connected',
      sessionId,
      timestamp: Date.now(),
    }));
  }

  broadcast(message, excludeSessionId = null) {
    const messageStr = JSON.stringify(message);
    
    for (const [sessionId, session] of this.sessions) {
      if (sessionId !== excludeSessionId) {
        try {
          session.webSocket.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting to session:', sessionId, error);
          this.sessions.delete(sessionId);
        }
      }
    }
  }

  // Get online users
  getOnlineUsers() {
    return Array.from(this.userSessions.keys());
  }

  // Cleanup inactive sessions (called periodically by alarm)
  async alarm() {
    const now = Date.now();
    const timeout = 60000; // 60 seconds

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastPing > timeout) {
        session.webSocket.close(1000, 'Timeout');
        this.sessions.delete(sessionId);
        
        if (session.userId) {
          this.userSessions.delete(session.userId);
        }
      }
    }

    // Schedule next cleanup
    await this.state.storage.setAlarm(Date.now() + 30000);
  }
}
