INSERT INTO users (id, login, email, name, password, customerid, userroleid, alldevicesavailable, allconfigavailable, passwordreset, twofactoraccepted, lastloginfail)
VALUES 
(2, 'Henrique', 'henrique@mdrinformaticaecelulares.com.br', 'Henrique', 'BD44B43DD604A36BE0E9DD9F5180AD8375DA26EE', 1, 2, true, true, false, false, 0),
(3, 'Maykon', 'maykon@mdrinformaticaecelulares.com.br', 'Maykon', '55AA65A9157E5568AE4CC059CAA6DE233098C7B4', 1, 2, true, true, false, false, 0)
ON CONFLICT (id) DO UPDATE SET 
login = EXCLUDED.login,
email = EXCLUDED.email,
name = EXCLUDED.name,
password = EXCLUDED.password,
customerid = EXCLUDED.customerid,
userroleid = EXCLUDED.userroleid,
alldevicesavailable = EXCLUDED.alldevicesavailable,
allconfigavailable = EXCLUDED.allconfigavailable,
passwordreset = EXCLUDED.passwordreset;
