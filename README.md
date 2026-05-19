# ChatRoom

A real-time chat room application for text, images, files, and audio sharing, built with Node.js and AngularJS.

[**Live Demo**](http://chat.systenics.com)

## Features

- **Real-time Messaging** - Powered by Socket.io for instant message delivery
- **Multi-format File Sharing** - Support for images, documents (PDF, Excel, Word, Text), and audio (MP3)
- **Room Management** - Create chat rooms, kick users, mute users, and manage room members
- **Sensitive Word Filtering** - Configurable content moderation
- **Internationalization** - English and Chinese language support
- **Theme System** - Light and dark theme switching
- **Message Management** - Edit, delete, search messages with burn-after-reading option
- **Chat Export** - Export chat history in various formats
- **File Preview** - Built-in preview for images, PDF documents, and audio files
- **Auto File Cleanup** - Automatic deletion of expired files to save server space

## Architecture

```
ChatRoom/
├── app.js                    # Node.js backend entry point
├── database/                 # Database layer (SQLite)
│   ├── db.js                 # Database operations
│   ├── roomManager.js        # Room state management
│   └── userManager.js        # User state management
├── public/                   # Frontend static resources
│   ├── index.html            # Main HTML entry
│   └── app/
│       ├── controllers/      # AngularJS controllers
│       ├── services/         # Business services
│       ├── directives/       # Custom Angular directives
│       ├── views/            # HTML templates
│       └── css/              # Stylesheets
├── config/                   # Configuration files
├── utils/                    # Utilities (logging, error handling)
└── docs/                     # Documentation and specs
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express, Socket.io |
| **Database** | SQLite3 |
| **Frontend** | AngularJS 1.x, Bootstrap 3, AdminLTE |
| **File Upload** | Formidable |
| **Internationalization** | angular-translate |
| **Rich Text** | CKEditor, bootstrap-wysihtml5 |
| **Charts** | Chart.js |

## Installation

### Prerequisites

- Node.js and npm installed globally
- (Optional) Bower for frontend dependencies

### Steps

1. Clone the repository
```sh
git clone https://github.com/systenics/ChatRoom.git
cd ChatRoom
```

2. Install backend dependencies
```sh
npm install
```

3. Install frontend dependencies (if using bower)
```sh
bower install
```

4. Configure application URL

Edit `public/app/js/app.js`:
```javascript
$rootScope.baseUrl = 'http://localhost:8282';  // Change to your server URL
$socketProvider.setConnectionUrl('http://localhost:8282');  // Change to your server URL
```

5. Start the server
```sh
node app.js
```

6. Open your browser and navigate to `http://localhost:8282`

## Configuration

### File Expiry Settings

In `app.js`:
```javascript
var expiryTime = 8;    // File expiry time in hours
var routineTime = 1;   // Cleanup routine interval in hours
```

### Sensitive Words

Edit `config/sensitive-words.json` to configure content filtering.

### Database

Chat history is stored in `database/chat_history.db` (SQLite). Message retention defaults to 30 days.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the server on port 8282 |
| `npm test` | Run Jest test suite |

## License

MIT

## Authors

- Saurabh Nandu - [Systenics](http://www.systenics.com)

## Contributors

- Balkrishna Sawant
- Pravin Kumar Mishra

## Repository

- [GitHub](https://github.com/systenics/ChatRoom)
