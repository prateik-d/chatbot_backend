<?php 

 require_once(\ProcessWire\wire('files')->compile(\ProcessWire\wire("config")->paths->root . "site/templates/inc/Rest.php",array('includes'=>true,'namespace'=>true,'modules'=>true,'skipIfNamespace'=>true)));

// set vars with the default output
$statuscode = 200;
$response = [];
$header = Rest\Header::mimeType('json');

// if we have an urlsegment and it is a numeric string we get data from or update an existing page: handle GET and PUT requests
if($input->urlSegment1 && is_numeric($input->urlSegment1)) { 

    $pageId = $input->urlSegment1;


    // GET request: get data from existing page
    if(Rest\Request::is('get')) { 

        // get the page for given Id
        $p = $pages->get($pageId);

        if($p->id) {
            $pdata = ["id" => $pageId]; // array for storing page data with added page id

            $p->of(false); // set output formatting to false before retrieving page data

            // loop through the page fields and add their names and values to $pdata array
            foreach($p->template->fieldgroup as $field) {
                if($field->type instanceof \ProcessWire\FieldtypeFieldsetOpen) continue;
                $value = $p->get($field->name); 
                $pdata[$field->name] = $field->type->sleepValue($p, $field, $value);
            }

            $response = $pdata;

        } else {
            //page does not exist
            $response["error"] = "The page does not exist";
            $statuscode = 404; // Not Found (see /site/templates/inc/Rest.php)
        }

    }
    // PUT request: update data of existing page
    if(Rest\Request::is('put')) { 

        // get data that was sent from the client in the request body + username and pass for authentication
        $params = Rest\Request::params();

        // verify that this is an authorized request (kept very basic)
        $apiKey = $pages->get("template=api")->key;
        $apiUser = "myapiuser";

        if($params["uname"] != $apiUser || $params["upass"] != $apiKey) {
            // unauthorized request
            $response["error"] = "Authorization failed";
            $statuscode = 401; // Unauthorized (see /site/templates/inc/Rest.php)

        } else {
            // authorized request
            
            // get the page for given Id
            $p = $pages->get($pageId);

            if($p->id) {
                $p->of(false);

                $p->title = $sanitizer->text($params["title"]);
                $p->name = $sanitizer->pageName($params["name"]);

                $p->save();

                $response["success"] = "Page updated successfully";

            } else {
                // page does not exist
                $response["error"] = "The page does not exist";
                $statuscode = 404; // Not Found (see /site/templates/inc/Rest.php)
            }
        }

    }

} else {
    // no url segment: handle POST requests

    // POST request: create new page
        if(Rest\Request::is('post')) { 

            // get data that was sent from the client in the request body + username and pass for authentication
            // $params = Rest\Request::params();
        	$logs = $input->post('logs');
        	$myPublicIP = trim(shell_exec("dig +short myip.opendns.com @resolver1.opendns.com"));
        	$date = date('Y-m-d H:i:s');

        	// print_r($date);
        	// die;

            $table = 'chatbot_logs';


         	$statement = $this->database->prepare('INSERT INTO chatbot_logs (logs, ip, created_date, modified_date) VALUES (?, ?, ?, ?)');
         	$result = $statement->execute(array($logs, $myPublicIP, $date, $date));
         	// $statement->bindParam(":logs", "The boat is 17' long. "); // Defaults to binding as a string.
         	// $statement->execute();

   //          die;

   //          if ($results) {
			//    // loop through the result set and inspect one row at a time
			//    // while ($row = $results->fetch_array()) {
			//    //     array_push($rows, $row);
			//    // }
   //          	print_r('1');
			// }
			// else
			// {
			// 	print_r('2');
			// }

         	$data = array(
         					'logs' => $logs, 
         					'ip' => $myPublicIP, 
         					'created_date' => $date, 
         					'modified_date' => $date
         				);

         	// print_r($data);
         	$response = $data; 

            // $event = $rows[0][event];

            // print_r($row);
            // verify that this is an authorized request (kept very basic)
            // $apiKey = $pages->get("template=api")->key;
            // $apiUser = "myapiuser";

            // if($params["uname"] != $apiUser || $params["upass"] != $apiKey) {
            //     // unauthorized request
            //     $response["error"] = "Authorization failed";
            //     $statuscode = 401; // Unauthorized (see /site/templates/inc/Rest.php)

            // } else {
            //     // authorized request
                
            //     // create the new page
            //     $p = new \ProcessWire\Page();
            //     $p->template = $sanitizer->text($params["template"]); 
            //     $p->parent = $pages->get($sanitizer->text($params["parent"])); 
            //     $p->name = $sanitizer->pageName($params["name"]);
            //     $p->title = $sanitizer->text($params["title"]); 
            //     $p->save(); 

            //     if($p->id) {

            //         $response["success"] = "Page created successfully";
            //         $response["url"] = "http://localhost/processwire/api/pages/{$p->id}";

            //     } else {
            //         // page does not exist
            //         $response["error"] = "Something went wrong";
            //         $statuscode = 404; // just as a dummy. Real error code depends on the type of error.
            //     }
            // }

        }

}

// render the response and body
http_response_code($statuscode);
header($header);
echo json_encode($response);