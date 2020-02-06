<?php 

 require_once(\ProcessWire\wire('files')->compile(\ProcessWire\wire("config")->paths->root . "site/templates/inc/Rest.php",array('includes'=>true,'namespace'=>true,'modules'=>true,'skipIfNamespace'=>true)));

// set vars with the default output
$statuscode = 200;
$response = [];
$header = Rest\Header::mimeType('json');

// if we have an urlsegment and it is a numeric string we get data from or update an existing page: handle GET and PUT requests
    // no url segment: handle POST requests

        
        if(Rest\Request::is('post')) 
        { 

            // get data that was sent from the client in the request body + username and pass for authentication
            
        	$logs = $input->post('logs');
        	$myPublicIP = trim(shell_exec("dig +short myip.opendns.com @resolver1.opendns.com"));
        	$date = date('Y-m-d H:i:s');

            $table = 'chatbot_logs';

            if($logs)
            {

             	$statement = $this->database->prepare('INSERT INTO chatbot_logs (logs, ip, created_date, modified_date) VALUES (?, ?, ?, ?)');
             	$result = $statement->execute(array($logs, $myPublicIP, $date, $date));
             	
             	$data = array(
             					'logs' => $logs, 
             					'ip' => $myPublicIP, 
             					'created_date' => $date, 
             					'modified_date' => $date
             				);

             	// print_r($data);
             	$response = $data; 
            }
        }

// render the response and body
http_response_code($statuscode);
header($header);
echo json_encode($response);