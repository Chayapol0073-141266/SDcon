const API_URL = 'https://script.google.com/macros/s/AKfycbzsZfOlllzIf4ZgXavkKpEiw0lCy6AB5IRq521R-76P5bPwpyqiL-BZNMAxV5xvAH1IsQ/exec';

// login
fetch(`${API_URL}?action=login&username=${u}&password=${p}`);

// get pending leaves, all leaves
fetch(`${API_URL}?action=getLeaves`);
fetch(`${API_URL}?action=getLeaves&employeeId=E001`);

// update status
fetch(API_URL, {
  method: 'POST',
  body: JSON.stringify({
    action: 'updateLeaveStatus',
    id,
    status: 'APPROVED',
    approverId: 'M001'
  })
});