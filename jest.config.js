module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'app.js',
        'database/*.js',
        'public/app/services/*.js'
    ],
    coverageDirectory: 'coverage',
    verbose: true,
    testTimeout: 30000,
    setupFilesAfterEnv: [],
    modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
    forceExit: true,
    detectOpenHandles: true
};
