puts "=== Starting Chatwoot Data Wipe ==="

conversations_count = Conversation.count
puts "Current Conversations: #{conversations_count}"
if conversations_count > 0
  puts "Destroying all conversations..."
  Conversation.destroy_all
  puts "Conversations after destroy: #{Conversation.count}"
else
  puts "No conversations to destroy."
end

contacts_count = Contact.count
puts "Current Contacts: #{contacts_count}"
if contacts_count > 0
  puts "Destroying all contacts..."
  Contact.destroy_all
  puts "Contacts after destroy: #{Contact.count}"
else
  puts "No contacts to destroy."
end

puts "=== Data Wipe Completed Successfully ==="
