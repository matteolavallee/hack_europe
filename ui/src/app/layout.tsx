import React from 'react';

// Placeholder for the main dashboard layout
// The layout sets up generic headers/footers for the caregiver dashboard interface.
export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>
                <main>{children}</main>
            </body>
        </html>
    )
}
