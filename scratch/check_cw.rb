puts "Running full REINDEX on primary Chatwoot tables..."
ActiveRecord::Base.connection.execute("REINDEX TABLE channel_api")
ActiveRecord::Base.connection.execute("REINDEX TABLE inboxes")
ActiveRecord::Base.connection.execute("REINDEX TABLE conversations")
ActiveRecord::Base.connection.execute("REINDEX TABLE contacts")
ActiveRecord::Base.connection.execute("REINDEX TABLE messages")
puts "Reindexing completed successfully!"
