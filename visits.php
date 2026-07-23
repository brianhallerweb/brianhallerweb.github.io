<?php
// visits.php

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Read the raw JSON input from the JavaScript fetch request
    $input = json_decode(file_get_contents('php://input'), true);

    if ($input) {
        // Capture server-side data
        $date         = date('Y-m-d H:i:s');
        $ip           = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
        
        // Capture and sanitize client-side data
        $referer      = $input['referer'] ?? 'Direct / None';
        $requestUrl   = $input['requestUrl'] ?? 'Unknown';
        $userAgent    = $input['userAgent'] ?? 'Unknown';

        // Format the log entry
        $logEntry = sprintf(
            "[%s] | IP: %s | URL: %s | Ref: %s | UA: %s\n",
            $date,
            $ip,
            $requestUrl,
            $referer,
            $userAgent
        );

        // Append to visits.txt safely
        file_put_contents('visits.txt', $logEntry, FILE_APPEND | LOCK_EX);
        
        http_response_code(200);
        echo json_encode(['status' => 'success']);
        exit;
    }
}

http_response_code(400);
echo json_encode(['status' => 'error']);
?>